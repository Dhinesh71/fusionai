const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key'
});

async function executePrompt(model, systemPrompt, userPrompt) {
    if (process.env.GROQ_API_KEY === 'dummy_key' || !process.env.GROQ_API_KEY) {
        // Return 40 if the prompt mentions "fail", otherwise return 85
        const score = userPrompt.toLowerCase().includes('fail') ? "40" : "85";
        console.log(`[AI Mock] Prompting ${model} -> Returning ${score}`);
        return score;
    }
    try {
        const validModels = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"];
        const safeModel = validModels.includes(model) ? model : "llama-3.3-70b-versatile";

        const completion = await groq.chat.completions.create({
            model: safeModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        });
        return completion.choices[0]?.message?.content || "";
    } catch (err) {
        console.error("Groq AI Error:", err);
        throw err;
    }
}

async function generateConditionLogic(promptText) {
    if (process.env.GROQ_API_KEY === 'dummy_key' || !process.env.GROQ_API_KEY) {
        return { field: "ai_node.output", operator: "greater_than", value: "50" };
    }
    const systemPrompt = `You are a Logic Converter.
Convert the user's plain English condition into a JSON object with strictly these keys:
{
  "field": "The node variable to check (e.g., ai_node.output or triggerData.score)",
  "operator": "Must be exactly one of: greater_than, less_than, equals, contains",
  "value": "The value to compare against"
}
Only output valid JSON with no extra text or markdown format.`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: promptText }
            ],
            response_format: { type: "json_object" }
        });
        const content = completion.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
    } catch (err) {
        console.error("Groq Condition AI Error:", err);
        throw err;
    }
}

async function generateWorkflowFromPrompt(description, apiKey) {
    const activeKey = apiKey || process.env.GROQ_API_KEY;

    const systemPrompt = `You are FusionFlow Workflow Architect, an expert in designing complex automation pipelines.
The user will describe an automation problem in plain English.
Your job is to design a complete FusionFlow workflow as a JSON object with two keys: "nodes" and "edges".

STRICT RULES FOR NODE GENERATION:
1. ALWAYS start with a "trigger" node (id: "node_1").
2. AI NODES ("type": "ai"):
   - "userPrompt" must use variables: {{triggerData.assignmentText}}, {{triggerData.studentName}}, or {{triggerData.attendanceStatus}}.
3. ACTION NODES ("type": "action"):
   - "actionType" is "Email", "SMS", "WhatsApp", or "Log".
   - "message" must use variables: e.g., "Hi {{triggerData.studentName}}".
4. Every node MUST have a valid "position" object: {"x": number, "y": number}.

NODE TYPES AVAILABLE:
- "trigger"   → data: { label: string, triggerType: "submission"|"attendance" }, position: {x, y}
- "ai"        → data: { label, model, systemPrompt, userPrompt }, position: {x, y}
- "condition" → data: { label, field, operator, value }, position: {x, y}
- "action"    → data: { label, actionType, message }, position: {x, y}

EDGE RULES:
- Each edge: { id: string, source: string, target: string, sourceHandle?: "true"|"false" }

LAYOUT:
- Main path: x increases by 350, y=150.
- Branches: y=50 (true), y=250 (false).

OUTPUT:
- Return ONLY valid JSON. No markdown. No text outside JSON.`;

    if (!activeKey || activeKey === 'dummy_key') {
        const dummyWorkflows = {
            attendance: {
                nodes: [
                    { id: "node_1", type: "trigger", position: { x: 100, y: 150 }, data: { label: "Attendance Marked", triggerType: "attendance" } },
                    { id: "node_2", type: "condition", position: { x: 450, y: 150 }, data: { label: "If Absent", field: "triggerData.attendanceStatus", operator: "equals", value: "absent" } },
                    { id: "node_3", type: "action", position: { x: 800, y: 50 }, data: { label: "Notify Parent", actionType: "WhatsApp", message: "Hi {{triggerData.studentName}}, you were marked absent today." } }
                ],
                edges: [
                    { id: "e1-2", source: "node_1", target: "node_2" },
                    { id: "e2-3", source: "node_2", target: "node_3", sourceHandle: "true" }
                ]
            },
            assignment: {
                nodes: [
                    { id: "node_1", type: "trigger", position: { x: 50, y: 150 }, data: { label: "Student Assignment Submission", triggerType: "submission" } },
                    { id: "node_2", type: "ai", position: { x: 350, y: 150 }, data: { label: "Grade Assignment", model: "llama-3.3-70b-versatile", systemPrompt: "You are an academic grader.", userPrompt: "Grade this: {{triggerData.assignmentText}}" } },
                    { id: "node_3", type: "condition", position: { x: 650, y: 150 }, data: { label: "IF score less_than 50", field: "score", operator: "less_than", value: "50" } },
                    { id: "node_4", type: "action", position: { x: 950, y: 50 }, data: { label: "Ask to resubmit", actionType: "Email", message: "Hi {{triggerData.studentName}}, please resubmit with a score of {{score}}." } },
                    { id: "node_5", type: "action", position: { x: 950, y: 250 }, data: { label: "Congratulate and send grade", actionType: "Email", message: "Hi {{triggerData.studentName}}, you passed with a score of {{score}}." } }
                ],
                edges: [
                    { id: "e1-2", source: "node_1", target: "node_2" },
                    { id: "e2-3", source: "node_2", target: "node_3" },
                    { id: "e3-4", source: "node_3", target: "node_4", sourceHandle: "true" },
                    { id: "e3-5", source: "node_3", target: "node_5", sourceHandle: "false" }
                ]
            }
        };

        const category = description.toLowerCase().includes('attendance') || description.toLowerCase().includes('absent') ? 'attendance' : 'assignment';
        return dummyWorkflows[category];
    }

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: description }
            ],
            response_format: { type: "json_object" }
        });
        const content = completion.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
    } catch (err) {
        console.error("Groq Workflow AI Error:", err);
        throw err;
    }
}

async function processAITask(taskType, inputData) {
    if (process.env.GROQ_API_KEY === 'dummy_key' || !process.env.GROQ_API_KEY) {
        return { result: "AI processing simulated (Dummy Key)" };
    }
    // Generic task processing
    return { result: "Task complete" };
}

module.exports = { executePrompt, generateConditionLogic, generateWorkflowFromPrompt, processAITask };
