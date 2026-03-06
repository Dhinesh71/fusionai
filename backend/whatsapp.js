const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let isReady = false;

function initWhatsApp() {
    console.log('🔄 Initializing WhatsApp client...');
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            args: ['--no-sandbox'],
        }
    });

    client.on('qr', (qr) => {
        console.log('\n--- 📲 SCAN THIS QR CODE FOR WHATSAPP ---');
        qrcode.generate(qr, { small: true });
        console.log('-----------------------------------------\n');
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp is ready!');
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log('✅ WhatsApp Authenticated!');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp Auth Failure:', msg);
    });

    client.initialize().catch(err => {
        console.error('❌ WhatsApp Init Error:', err.message);
    });
}

async function sendWhatsAppMessage(number, message) {
    if (!isReady) {
        console.log('[DEBUG] WhatsApp is not ready. Falling back to Log Simulation.');
        console.log(`[WHATSAPP MOCK] To: ${number}, Msg: ${message}`);
        return { success: false, error: 'WhatsApp not ready' };
    }

    try {
        // Format number: remove plus, spaces, etc.
        let formatted = number.replace(/\D/g, '');

        // Auto-handle 10 digit numbers by assuming India (+91)
        if (formatted.length === 10) {
            formatted = '91' + formatted;
        }

        const chatId = formatted.includes('@c.us') ? formatted : `${formatted}@c.us`;

        await client.sendMessage(chatId, message);
        console.log(`✅ WhatsApp sent to ${number}`);
        return { success: true };
    } catch (err) {
        console.error('❌ WhatsApp Send Error:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { initWhatsApp, sendWhatsAppMessage };
