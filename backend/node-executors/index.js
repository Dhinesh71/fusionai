const { executePrompt } = require('../ai');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { sendWhatsAppMessage } = require('../whatsapp');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || '',
        pass: process.env.GMAIL_PASS || ''
    }
});

const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

async function handleNode(node, state, def) {
    const { type, data } = node;

    // Find AI result explicitly to add 'score' aliases
    const aiResultNode = Object.values(state.nodeResults || {}).find(r => r?.output !== undefined);
    const inferredScore = aiResultNode ? aiResultNode.output : null;

    // Provide a combined context for template resolution
    const context = {
        ...state.triggerData, // Flatten for simple {{studentName}} access
        score: inferredScore, // Alias {{score}}
        ...state.nodeResults,
        triggerData: {
            ...state.triggerData,
            score: inferredScore // Alias {{triggerData.score}}
        }
    };

    if (type === 'ai') {
        const input = resolveTemplate(data.userPrompt, context);
        // Force extreme brevity to improve speed and parseability
        const strictPrompt = (data.systemPrompt || 'You are an AI assistant.') + '\n\nIMPORTANT: Be extremely concise. If asked to grade or score, output ONLY the numeric score (e.g. 85) without any additional text or formatting.';
        const result = await executePrompt(data.model, strictPrompt, input);
        return { output: result };
    }

    if (type === 'condition') {
        return evaluateCondition(node, context);
    }

    if (type === 'action') {
        return await executeAction(node, context);
    }

    return {};
}

function resolveTemplate(template, nodeResults) {
    if (!template || typeof template !== 'string') return template;
    return template.replace(/\{\{(.+?)\}\}/g, (match, p1) => {
        const parts = p1.trim().split('.');
        let val = nodeResults;
        for (let part of parts) {
            if (val && val[part] !== undefined) val = val[part];
            else return '';
        }
        return val;
    });
}

function evaluateCondition(node, nodeResults) {
    try {
        const { field, operator, value } = node.data;
        const actualValue = resolveTemplate(`{{${field}}}`, nodeResults);

        // Attempt to extract purely numeric values if needed
        const match = String(actualValue).match(/\d+/);
        const parsedNumber = match ? Number(match[0]) : Number.NaN;

        let conditionResult = false;
        switch (operator) {
            case 'greater_than':
                conditionResult = !isNaN(parsedNumber) && parsedNumber > Number(value);
                break;
            case 'less_than':
                conditionResult = !isNaN(parsedNumber) && parsedNumber < Number(value);
                break;
            case 'equals':
                conditionResult = actualValue == value;
                break;
            case 'contains':
                conditionResult = String(actualValue).toLowerCase().includes(String(value).toLowerCase());
                break;
        }
        return { conditionResult };
    } catch (e) {
        return { conditionResult: false };
    }
}

async function executeAction(node, nodeResults) {
    const { actionType, message, email } = node.data;
    const resolvedMessage = resolveTemplate(message, nodeResults);

    if (actionType === 'Email') {
        const targetEmail = email || nodeResults.triggerData?.studentEmail;

        if (!targetEmail) {
            console.error('[Email Action] No target email found.');
            return { success: false, error: 'No target email' };
        }

        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            console.warn('[Email Action MOCK] Log: Email to ' + targetEmail + ' | Content: ' + resolvedMessage);
            return { success: true, simulated: true };
        }

        try {
            const subject = node.data.subject
                ? resolveTemplate(node.data.subject, nodeResults)
                : `Update on your Assignment: ${nodeResults.triggerData?.studentUsername || 'Update'}`;

            await transporter.sendMail({
                from: `"FusionFlow Automation" <${process.env.GMAIL_USER}>`,
                to: targetEmail,
                subject: subject,
                text: resolvedMessage
            });
            console.log(`[Email Action] Sent to ${targetEmail}`);
        } catch (err) {
            console.error('[Email Action Error]', err.message);
            return { success: false, error: err.message };
        }
    } else if (actionType === 'WhatsApp' || actionType === 'SMS') {
        const phone = node.data.phone || nodeResults.triggerData?.parentPhone || nodeResults.triggerData?.studentPhone;

        if (!phone) {
            console.error(`[${actionType} Action] No target phone number found.`);
            return { success: false, error: 'No target phone' };
        }

        // --- REAL WHATSAPP MODE ---
        if (actionType === 'WhatsApp') {
            const res = await sendWhatsAppMessage(phone, resolvedMessage);
            return res;
        }

        // --- REAL TWILIO MODE ---
        if (actionType === 'SMS' && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            try {
                console.log(`[SMS Action] ATTEMPTING via Twilio to: ${phone}`);
                const message = await twilioClient.messages.create({
                    body: resolvedMessage,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phone
                });
                console.log(`[SMS Action] SUCCESS via Twilio. SID: ${message.sid}`);
                return { success: true, method: 'Twilio', sid: message.sid };
            } catch (err) {
                console.error('[SMS Action Twilio Error]', err.message);
                // Fall back to simulation log if real fails, but return failure
                return { success: false, error: 'Twilio Error: ' + err.message };
            }
        }

        // --- SIMULATION MODE ---
        console.log(`\n--- 📱 SMS SIMULATION ---`);
        console.log(`To: ${phone}`);
        console.log(`Message: "${resolvedMessage}"`);
        console.log(`Status: [LOG ONLY - Provider not configured in .env]`);
        console.log(`-------------------------\n`);

        return { success: true, method: 'Simulation', recipient: phone };
    } else {
        console.log(`[ACTION] ${actionType}: ${resolvedMessage}`);
    }

    return { success: true };
}

module.exports = { handleNode };
