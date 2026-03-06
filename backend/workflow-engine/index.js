const { handleNode } = require('../node-executors');
const { createRunLog, updateRunLog } = require('../database');

async function getWorkflowDef(workflowId) {
    return global.workflowsDB ? global.workflowsDB[workflowId] : null;
}

async function runWorkflow(nodes, edges, initialData) {
    const logs = [];
    const state = { triggerData: initialData, nodeResults: {} };

    logs.push("Initializing workflow execution...");
    const trigger = nodes.find(n => n.type === 'trigger');
    if (!trigger) throw new Error("No trigger node found");

    let currentNode = trigger;
    state.nodeResults[currentNode.id] = initialData;
    logs.push(`Manual trigger started with data: ${JSON.stringify(initialData)}`);

    while (currentNode) {
        logs.push(`Executing: [${currentNode.data.label || currentNode.id}] (${currentNode.type})`);

        let result = {};
        if (currentNode.type !== 'trigger') {
            result = await handleNode(currentNode, state, { nodes, edges });
            state.nodeResults[currentNode.id] = result;
            logs.push(`↳ Result: ${JSON.stringify(result)}`);
        }

        const outgoingEdges = edges.filter(e => e.source === currentNode.id);
        if (outgoingEdges.length === 0) {
            logs.push("Workflow reached end node.");
            break;
        }

        let nextNodeId = null;
        if (currentNode.type === 'condition') {
            const path = state.nodeResults[currentNode.id]?.conditionResult ? 'true' : 'false';
            logs.push(`↳ Condition evaluated to: ${path}`);
            const edge = outgoingEdges.find(e => e.sourceHandle === path) || outgoingEdges[0];
            nextNodeId = edge?.target;
        } else {
            nextNodeId = outgoingEdges[0]?.target;
        }

        currentNode = nodes.find(n => n.id === nextNodeId);
        if (!currentNode) break;
    }

    return { success: true, state, logs };
}

async function executeWorkflow(workflowId, initialData) {
    const def = await getWorkflowDef(workflowId);
    if (!def) throw new Error("Workflow not found");

    await createRunLog(workflowId, initialData); // Ignoring result for now as per minimal mock logic
    await runWorkflow(def.nodes, def.edges, initialData);
}

module.exports = { executeWorkflow, runWorkflow };
