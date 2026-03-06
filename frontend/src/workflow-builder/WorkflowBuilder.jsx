import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
    ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Bot, Zap, Play, Split, Save, Terminal, Send, X, Sun, Moon, Key, CheckCircle, Users, AlertTriangle, Loader, Edit2, Settings, MessageSquare, Database, Sparkles, Wand2, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import TriggerNode from '../node-library/TriggerNode';
import AINode from '../node-library/AINode';
import ConditionNode from '../node-library/ConditionNode';
import ActionNode from '../node-library/ActionNode';

const nodeTypes = {
    trigger: TriggerNode,
    ai: AINode,
    condition: ConditionNode,
    action: ActionNode,
};

let generatorId = Date.now();
const getId = () => `node_${generatorId++}`;

export default function WorkflowBuilder() {
    const { id } = useParams();
    const reactFlowWrapper = useRef(null);
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [searchParams] = useSearchParams();

    // Session context — determines menu/save behaviour
    const isTeacher = !!sessionStorage.getItem('teacher_session');
    const isStudent = !!sessionStorage.getItem('student');

    const [workflowName, setWorkflowName] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testData, setTestData] = useState({ assignmentText: 'This is a sample assignment about AI.', studentEmail: 'student@example.com' });
    const [testLoading, setTestLoading] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [dark, setDark] = useState(() => localStorage.getItem('editor-theme') !== 'light');

    // AI Workflow Generator
    const [aiGenOpen, setAiGenOpen] = useState(true);
    const [aiGenPrompt, setAiGenPrompt] = useState('');
    const [aiGenLoading, setAiGenLoading] = useState(false);
    const [aiGenError, setAiGenError] = useState('');
    const [loading, setLoading] = useState(!!id);

    // Node Config Sidebar
    const [configPanel, setConfigPanel] = useState(null); // { nodeId, type }
    const [triggerApiKey, setTriggerApiKey] = useState('');
    const [triggerValidating, setTriggerValidating] = useState(false);
    const [triggerInfo, setTriggerInfo] = useState(null); // { teacherUsername, students[] }
    const [triggerError, setTriggerError] = useState('');

    useEffect(() => {
        if (id) {
            fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/workflows/${id}`)
                .then(res => res.json())
                .then(data => {
                    setNodes(data.nodes || []);
                    setEdges(data.edges || []);
                    setWorkflowName(data.name || 'Untitled Workflow');
                    setLoading(false);
                })
                .catch(() => {
                    alert('Failed to load workflow data');
                    setLoading(false);
                });
        }
    }, [id, setNodes, setEdges]);

    const toggleTheme = () => setDark(prev => {
        const next = !prev;
        localStorage.setItem('editor-theme', next ? 'dark' : 'light');
        return next;
    });

    const t = dark ? {
        wrap: 'bg-slate-950',
        aside: 'bg-slate-900 border-slate-800',
        heading: 'text-white',
        subheading: 'text-slate-500',
        nodeCard: 'border-slate-800 hover:bg-slate-800',
        nodeLabel: 'text-slate-300',
        divider: 'border-slate-800',
        backBtn: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700',
        canvas: 'bg-slate-950',
        bgColor: '#1e293b',
        controls: 'bg-slate-900',
        testPanel: 'bg-slate-900',
        testHeader: 'border-slate-800',
        testInput: 'bg-slate-800 border-slate-700 text-white',
        testLabel: 'text-slate-400',
        testFooter: 'bg-slate-900 border-slate-800',
        testBtn: 'bg-slate-800 text-white hover:bg-slate-700',
        themeToggle: 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700',
    } : {
        wrap: 'bg-slate-50',
        aside: 'bg-white border-slate-200',
        heading: 'text-slate-800',
        subheading: 'text-slate-400',
        nodeCard: 'border-slate-100 hover:bg-slate-50',
        nodeLabel: 'text-slate-700',
        divider: 'border-slate-100',
        backBtn: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
        canvas: 'bg-slate-50',
        bgColor: '#e2e8f0',
        controls: 'bg-white',
        testPanel: 'bg-white',
        testHeader: 'border-slate-100',
        testInput: 'bg-slate-50 border-slate-100 text-slate-700',
        testLabel: 'text-slate-400',
        testFooter: 'bg-slate-50 border-slate-100',
        testBtn: 'bg-slate-800 text-white hover:bg-slate-900',
        themeToggle: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
    };

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onNodeClick = useCallback((event, node) => {
        setConfigPanel({ nodeId: node.id, type: node.type });
        if (node.type === 'trigger') {
            setTriggerApiKey(node.data.apiKey || '');
            setTriggerInfo(node.data.apiKey ? {
                teacherUsername: node.data.teacherUsername,
                students: Array(node.data.studentCount || 0).fill(null),
            } : null);
            setTriggerError('');
        }
    }, []);

    const updateNodeData = (nodeId, newData) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    };

    const validateAndLinkApiKey = async () => {
        if (!triggerApiKey.trim()) return setTriggerError('Please paste your API key.');
        setTriggerValidating(true);
        setTriggerError('');
        setTriggerInfo(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/validate-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: triggerApiKey.trim() }),
            });
            const data = await res.json();
            if (!res.ok) return setTriggerError('❌ Invalid API Key. Generate one in Teacher Console → API Key tab.');

            const studRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/teacher/${data.teacherUsername}/students`);
            const students = await studRes.json();

            setTriggerInfo({ teacherUsername: data.teacherUsername, students });

            updateNodeData(configPanel.nodeId, {
                apiKey: triggerApiKey.trim(),
                teacherUsername: data.teacherUsername,
                studentCount: students.length
            });
        } catch {
            setTriggerError('Cannot connect to backend. Is the server running?');
        } finally {
            setTriggerValidating(false);
        }
    };

    const closeConfigPanel = () => { setConfigPanel(null); setTriggerInfo(null); setTriggerError(''); };

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: getId(),
                type,
                position,
                data: type === 'ai' ? {
                    label: 'Grade Assignment',
                    model: 'llama-3.3-70b-versatile',
                    systemPrompt: 'You are an academic grader.',
                    userPrompt: 'Grade this: {{triggerData.assignmentText}}'
                } : type === 'condition' ? {
                    label: 'Pass/Fail Check',
                    field: 'triggerData.assignmentText',
                    operator: 'contains',
                    value: 'excellent'
                } : type === 'action' ? {
                    label: 'Send Notification',
                    actionType: 'Email',
                    message: 'Your grade is ready.'
                } : { label: `${type} node` },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const saveWorkflow = async () => {
        const teacherRaw = sessionStorage.getItem('teacher_session');
        const studentRaw = sessionStorage.getItem('student');

        const finalId = id || `wf_${Date.now()}`;
        const finalName = workflowName || 'Untitled Workflow';

        try {
            let teacherId = null;
            let studentId = null;

            if (isTeacher) {
                // ── Teacher: API key in trigger node is required ──
                const triggerNode = nodes.find(n => n.type === 'trigger');
                const apiKey = triggerNode?.data?.apiKey;
                if (!apiKey) {
                    alert('⚠️  No API Key linked!\n\nClick on the Trigger node → paste your Teacher API Key → click "Link & Confirm" first.');
                    if (triggerNode) setConfigPanel({ nodeId: triggerNode.id, type: 'trigger' });
                    return;
                }
                const validateRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/validate-key`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey }),
                });
                const validateData = await validateRes.json();
                if (!validateRes.ok || validateData.ownerType !== 'teacher') {
                    return alert('❌ Invalid Teacher API Key. Please re-link via the Trigger config panel.');
                }
                teacherId = validateData.teacherId;

            } else if (isStudent) {
                // ── Student: save under their OWN studentId (full isolation) ──
                const studentData = JSON.parse(studentRaw);
                studentId = studentData.id;
                if (!studentId) return alert('⚠️ Could not identify your account. Please log out and log in again.');

                // If student has an API key in the trigger node, validate it (optional enhancement)
                const triggerNode = nodes.find(n => n.type === 'trigger');
                const triggerApiKeyVal = triggerNode?.data?.apiKey;
                if (triggerApiKeyVal) {
                    const validateRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/validate-key`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ apiKey: triggerApiKeyVal }),
                    });
                    const validateData = await validateRes.json();
                    if (!validateRes.ok || validateData.ownerType !== 'student' || validateData.studentId !== studentId) {
                        return alert('❌ Trigger API Key does not match your account. Use your own key from the API Key tab.');
                    }
                }
            }

            const existingWf = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/workflows/${finalId}`).then(r => r.ok ? r.json() : null).catch(() => null);
            const currentStatus = existingWf?.status || 'stopped';

            const saveRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/workflows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: finalId,
                    name: finalName,
                    nodes, edges,
                    teacherId,
                    studentId,
                    status: currentStatus,
                }),
            });

            if (saveRes.ok) {
                alert(`✅ Workflow "${finalName}" saved!`);
                if (isTeacher) navigate('/teacher');
                else if (isStudent) navigate('/student');
                else navigate(-1);
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving workflow. Please check the console.');
        }
    };


    const runWorkflowTest = async () => {
        setTestLoading(true);
        setTestResults(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/workflows/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workflow: { nodes, edges },
                    triggerData: testData
                }),
            });
            const data = await response.json();
            setTestResults(data);
        } catch (error) {
            console.error('Execution error:', error);
            alert('Workflow execution failed.');
        } finally {
            setTestLoading(false);
        }
    };

    const generateFromAI = async () => {
        if (!aiGenPrompt.trim()) return;
        setAiGenLoading(true);
        setAiGenError('');

        // Find existing API key from trigger node if available
        const triggerNode = nodes.find(n => n.type === 'trigger');
        const apiKey = triggerNode?.data?.apiKey;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/ai/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: aiGenPrompt.trim(),
                    apiKey: apiKey // Pass the API key if we have one
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Generation failed');
            if (!data.workflow?.nodes?.length) throw new Error('AI returned an empty workflow. Try a more specific description.');

            // If we had an API key before, and the new workflow has a trigger node, preserve it
            const newNodes = data.workflow.nodes.map(node => {
                if (node.type === 'trigger' && apiKey) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            apiKey: apiKey,
                            teacherUsername: triggerNode.data?.teacherUsername,
                            studentCount: triggerNode.data?.studentCount
                        }
                    };
                }
                return node;
            });

            setNodes(newNodes);
            setEdges(data.workflow.edges || []);
            setWorkflowName(aiGenPrompt.slice(0, 48));
            setAiGenOpen(false);
        } catch (err) {
            setAiGenError(err.message);
        } finally {
            setAiGenLoading(false);
        }
    };

    const runTemplate = useCallback(() => {
        const templateNodes = [
            { id: 'node_1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'Assignment Submission' } },
            { id: 'node_2', type: 'ai', position: { x: 350, y: 150 }, data: { label: 'Grade Assignment', model: 'llama-3.3-70b-versatile', systemPrompt: 'You are an academic grader. Respond ONLY with a number 0-100.', userPrompt: 'Grade this: {{triggerData.assignmentText}}' } },
            { id: 'node_3', type: 'condition', position: { x: 650, y: 150 }, data: { label: 'Pass/Fail Check', field: 'node_2.output', operator: 'less_than', value: '50' } },
            { id: 'node_4', type: 'action', position: { x: 950, y: 50 }, data: { label: 'Request Rewrite', actionType: 'Email', message: 'Score: {{node_2.output}}. Please resubmit.' } },
            { id: 'node_5', type: 'action', position: { x: 950, y: 250 }, data: { label: 'Send Pass Email', actionType: 'Email', message: 'Congratulations! Score: {{node_2.output}}.' } }
        ];
        const templateEdges = [
            { id: 'e1-2', source: 'node_1', target: 'node_2' },
            { id: 'e2-3', source: 'node_2', target: 'node_3' },
            { id: 'e3-4', source: 'node_3', target: 'node_4', sourceHandle: 'true' },
            { id: 'e3-5', source: 'node_3', target: 'node_5', sourceHandle: 'false' }
        ];
        setNodes(templateNodes);
        setEdges(templateEdges);
    }, [setNodes, setEdges]);

    useEffect(() => {
        const template = searchParams.get('template');
        if (template === 'assignment' && !id) runTemplate();
    }, [searchParams, runTemplate, id]);

    if (loading) return (
        <div className={`h-full w-full flex flex-col items-center justify-center ${t.wrap}`}>
            <Loader className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
            <p className={`font-black uppercase tracking-widest text-xs ${t.subheading}`}>Loading Workflow Logic...</p>
        </div>
    );

    const currentNode = nodes.find(n => n.id === configPanel?.nodeId);

    return (
        <div className={`flex h-screen w-screen relative transition-colors duration-300 overflow-hidden ${t.wrap}`}>
            {/* Sidebar */}
            <aside className={`w-72 border-r flex flex-col shadow-sm transition-colors duration-300 overflow-y-auto ${t.aside}`}>

                {/* ── AI Workflow Generator ─────────────────────────── */}
                <div className={`border-b transition-colors ${t.divider}`}>
                    <button
                        onClick={() => setAiGenOpen(o => !o)}
                        className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${t.heading}`}
                    >
                        <div className="flex items-center">
                            <div className="p-1.5 rounded-lg bg-violet-600 mr-3">
                                <Wand2 className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-black text-sm">Generate with AI</span>
                        </div>
                        {aiGenOpen
                            ? <ChevronUp className="h-4 w-4 opacity-50" />
                            : <ChevronDown className="h-4 w-4 opacity-50" />}
                    </button>

                    {aiGenOpen && (
                        <div className="px-5 pb-5 space-y-3">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${t.subheading}`}>
                                Describe your automation problem
                            </p>
                            <textarea
                                id="ai-gen-prompt"
                                rows={4}
                                placeholder="e.g. When a student submits an essay, grade it with AI and email them the result..."
                                className={`w-full p-3 rounded-xl border text-xs outline-none resize-none leading-relaxed transition-colors ${t.testInput} focus:border-violet-500`}
                                value={aiGenPrompt}
                                onChange={e => { setAiGenPrompt(e.target.value); setAiGenError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); generateFromAI(); } }}
                            />
                            {aiGenError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 leading-relaxed">
                                    {aiGenError}
                                </div>
                            )}
                            <button
                                id="ai-gen-btn"
                                onClick={generateFromAI}
                                disabled={aiGenLoading || !aiGenPrompt.trim()}
                                className={`w-full flex items-center justify-center py-3 rounded-xl font-black text-sm transition-all ${aiGenLoading || !aiGenPrompt.trim()
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                                    }`}
                            >
                                {aiGenLoading
                                    ? <><Loader className="h-4 w-4 mr-2 animate-spin" />Building...</>
                                    : <><Wand2 className="h-4 w-4 mr-2" />Generate Workflow</>}
                            </button>
                            <p className={`text-[9px] text-center opacity-50 ${t.subheading}`}>Ctrl + Enter to generate</p>
                        </div>
                    )}
                </div>

                {/* ── Node Library ─────────────────────────────────── */}
                <div className="p-5 flex flex-col overflow-y-auto">
                    <p className={`text-[10px] mb-4 uppercase tracking-widest font-black transition-colors ${t.subheading}`}>Or drag nodes manually</p>

                    <div className="space-y-3">
                        {['trigger', 'ai', 'condition', 'action'].map(type => (
                            <div
                                key={type}
                                className={`group flex items-center p-3.5 border-2 rounded-xl cursor-grab transition-all ${t.nodeCard}
                                    ${type === 'trigger' ? 'hover:border-green-400 hover:bg-green-50' :
                                        type === 'ai' ? 'hover:border-indigo-400 hover:bg-indigo-50' :
                                            type === 'condition' ? 'hover:border-amber-400 hover:bg-amber-50' :
                                                'hover:border-rose-400 hover:bg-rose-50'}`}
                                onDragStart={(e) => onDragStart(e, type)} draggable
                            >
                                <div className={`p-2 rounded-lg transition-colors mr-3
                                    ${type === 'trigger' ? 'bg-green-100 text-green-600' :
                                        type === 'ai' ? 'bg-indigo-100 text-indigo-600' :
                                            type === 'condition' ? 'bg-amber-100 text-amber-600' :
                                                'bg-rose-100 text-rose-600'}`}>
                                    {type === 'trigger' ? <Play className="h-4 w-4" /> :
                                        type === 'ai' ? <Bot className="h-4 w-4" /> :
                                            type === 'condition' ? <Split className="h-4 w-4" /> :
                                                <Zap className="h-4 w-4" />}
                                </div>
                                <span className={`font-bold text-sm transition-colors ${t.nodeLabel}`}>
                                    {type === 'trigger' ? 'Trigger' : type === 'ai' ? 'AI Agent' : type === 'condition' ? 'Condition' : 'Action'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={`mt-auto pt-6 border-t transition-colors ${t.divider}`}>
                        <button
                            onClick={() => setIsTesting(true)}
                            className="w-full flex items-center justify-center p-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 text-sm"
                        >
                            <Terminal className="h-4 w-4 mr-2" />
                            Run Simulation
                        </button>
                    </div>
                </div>
            </aside>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden" ref={reactFlowWrapper}>
                <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center space-x-4 pointer-events-auto">
                        <button onClick={() => {
                            const isStudent = !!sessionStorage.getItem('student');
                            const isTeacher = !!sessionStorage.getItem('teacher_session');
                            if (isTeacher) navigate('/teacher');
                            else if (isStudent) navigate('/student');
                            else navigate(-1);
                        }} className={`px-4 py-2.5 rounded-xl border font-bold shadow-sm transition-all flex items-center ${t.backBtn}`}><X className="h-4 w-4 mr-2" /> Exit</button>
                        <div className={`flex items-center px-4 py-2 rounded-xl border transition-colors shadow-sm ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <Edit2 className="h-3.5 w-3.5 text-indigo-500 mr-3" />
                            <input
                                type="text"
                                className={`bg-transparent font-black text-sm outline-none w-48 transition-colors ${t.heading}`}
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                placeholder="Untitled Workflow..."
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 pointer-events-auto">
                        <button onClick={toggleTheme} className={`p-2.5 rounded-xl border font-bold shadow-sm transition-all ${t.themeToggle}`}>{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
                        <button onClick={saveWorkflow} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-black shadow-xl shadow-indigo-900/30 transition-all flex items-center transform hover:scale-105"><Save className="h-5 w-5 mr-2" /> Deploy Workflow</button>
                    </div>
                </div>

                <ReactFlowProvider>
                    <div className="flex-1 h-full w-full">
                        <ReactFlow
                            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver}
                            onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView className={`transition-colors duration-300 ${t.canvas}`}
                        >
                            <Controls className={`border-none shadow-xl rounded-lg overflow-hidden m-4 ${t.controls}`} />
                            <Background color={t.bgColor} gap={20} size={1} />
                        </ReactFlow>
                    </div>
                </ReactFlowProvider>

                {/* ── Node Config Panel ─────────────────────────────────── */}
                {configPanel && currentNode && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end p-6 pointer-events-auto" onClick={(e) => { if (e.target === e.currentTarget) closeConfigPanel(); }}>
                        <div className={`w-full max-w-md h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${t.testPanel}`}>
                            {/* Header */}
                            <div className={`p-6 border-b flex items-center justify-between transition-colors ${t.testHeader}`}>
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-xl mr-3 ${configPanel.type === 'trigger' ? 'bg-green-600' : configPanel.type === 'ai' ? 'bg-indigo-600' : configPanel.type === 'condition' ? 'bg-amber-600' : 'bg-rose-600'}`}>
                                        {configPanel.type === 'trigger' ? <Key className="h-5 w-5 text-white" /> : configPanel.type === 'ai' ? <Bot className="h-5 w-5 text-white" /> : configPanel.type === 'condition' ? <Split className="h-5 w-5 text-white" /> : <Zap className="h-5 w-5 text-white" />}
                                    </div>
                                    <div>
                                        <h2 className={`text-lg font-black transition-colors ${t.heading}`}>{configPanel.type.toUpperCase()} Node</h2>
                                        <p className={`text-xs transition-colors ${t.subheading}`}>Configure behavior and settings</p>
                                    </div>
                                </div>
                                <button onClick={closeConfigPanel} className="text-slate-400"><X className="h-6 w-6" /></button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Label (Universal) */}
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Display Label</label>
                                    <input
                                        type="text"
                                        className={`w-full p-4 rounded-xl border outline-none transition-colors ${t.testInput}`}
                                        value={currentNode.data.label || ''}
                                        onChange={e => updateNodeData(currentNode.id, { label: e.target.value })}
                                    />
                                </div>

                                {/* Trigger Specific */}
                                {configPanel.type === 'trigger' && (
                                    <div className="space-y-6">
                                        {isStudent ? (
                                            // Student context: use their OWN personal API key
                                            <>
                                                <div>
                                                    <p className={`text-sm font-bold mb-1 ${t.heading}`}>Link Your Personal API Key</p>
                                                    <p className="text-[11px] text-slate-500 mb-4">Get your key from the <span className="text-green-400 font-bold">API Key</span> tab on your dashboard.</p>
                                                    <div className="flex rounded-xl border overflow-hidden">
                                                        <input
                                                            type="text" className={`flex-1 p-4 font-mono text-xs outline-none ${t.testInput} border-none`}
                                                            placeholder="fs_xxxxxxxxxxxxxxxx"
                                                            value={triggerApiKey || (JSON.parse(sessionStorage.getItem('student') || '{}').apiKey || '')}
                                                            onChange={e => { setTriggerApiKey(e.target.value); setTriggerInfo(null); setTriggerError(''); }}
                                                        />
                                                        <button onClick={() => navigator.clipboard.readText().then(text => setTriggerApiKey(text.trim()))} className="px-4 bg-slate-700 text-slate-300 text-[10px] font-black">Paste</button>
                                                    </div>
                                                </div>
                                                <button onClick={validateAndLinkApiKey} disabled={triggerValidating || !(triggerApiKey || JSON.parse(sessionStorage.getItem('student') || '{}').apiKey || '').trim()} className={`w-full py-4 rounded-xl font-black text-sm ${triggerValidating ? 'bg-slate-700 text-slate-500' : 'bg-green-600 text-white shadow-xl shadow-green-900/30'}`}>
                                                    {triggerValidating ? 'Validating...' : 'Link & Confirm'}
                                                </button>
                                                {triggerError && <div className="p-4 bg-red-400/10 text-red-400 text-xs rounded-xl border border-red-400/20">{triggerError}</div>}
                                                {triggerInfo && (
                                                    <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                                        <div className="flex items-center mb-1"><CheckCircle className="h-4 w-4 text-green-400 mr-2" /><span className="font-black text-green-400 text-sm">Linked to your account</span></div>
                                                        <div className="text-[10px] text-slate-400">Workflow saved under your private account only.</div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Teacher context: paste API key
                                            <>
                                                <div>
                                                    <p className={`text-sm font-bold mb-4 ${t.heading}`}>1. Paste Teacher API Key</p>
                                                    <div className="flex rounded-xl border overflow-hidden">
                                                        <input
                                                            type="text" className={`flex-1 p-4 font-mono text-xs outline-none ${t.testInput} border-none`}
                                                            value={triggerApiKey} onChange={e => { setTriggerApiKey(e.target.value); setTriggerInfo(null); setTriggerError(''); }}
                                                        />
                                                        <button onClick={() => navigator.clipboard.readText().then(text => setTriggerApiKey(text.trim()))} className="px-4 bg-slate-700 text-slate-300 text-[10px] font-black">Paste</button>
                                                    </div>
                                                </div>
                                                <button onClick={validateAndLinkApiKey} disabled={triggerValidating || !triggerApiKey.trim()} className={`w-full py-4 rounded-xl font-black text-sm ${triggerValidating || !triggerApiKey.trim() ? 'bg-slate-700 text-slate-500' : 'bg-green-600 text-white shadow-xl shadow-green-900/30'}`}>
                                                    {triggerValidating ? 'Validating...' : 'Link & Confirm'}
                                                </button>
                                                {triggerError && <div className="p-4 bg-red-400/10 text-red-400 text-xs rounded-xl border border-red-400/20">{triggerError}</div>}
                                                {triggerInfo && (
                                                    <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                                        <div className="flex items-center mb-1"><CheckCircle className="h-4 w-4 text-green-400 mr-2" /><span className="font-black text-green-400 text-xs text-sm">Linked to {triggerInfo.teacherUsername}</span></div>
                                                        <div className="text-[10px] text-slate-400">{triggerInfo.students.length} students synchronized.</div>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-slate-700/50">
                                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Trigger Event</label>
                                                    <select
                                                        className={`w-full p-4 rounded-xl border outline-none ${t.testInput}`}
                                                        value={currentNode.data.triggerType || 'submission'}
                                                        onChange={e => updateNodeData(currentNode.id, { triggerType: e.target.value })}
                                                    >
                                                        <option value="submission">Student Assignment Submission</option>
                                                        <option value="attendance">Attendance Marked</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* AI Specific */}
                                {configPanel.type === 'ai' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>AI Model</label>
                                            <select className={`w-full p-4 rounded-xl border outline-none ${t.testInput}`} value={currentNode.data.model} onChange={e => updateNodeData(currentNode.id, { model: e.target.value })}>
                                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</option>
                                                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                                                <option value="gemma2-9b-it">Gemma 2 9B</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>System Persona</label>
                                            <textarea className={`w-full p-4 rounded-xl border outline-none h-24 ${t.testInput}`} value={currentNode.data.systemPrompt} onChange={e => updateNodeData(currentNode.id, { systemPrompt: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>User Prompt (use {'{{variable}}'}) </label>
                                            <textarea className={`w-full p-4 rounded-xl border outline-none h-32 ${t.testInput}`} value={currentNode.data.userPrompt} onChange={e => updateNodeData(currentNode.id, { userPrompt: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {/* Condition Specific */}
                                {configPanel.type === 'condition' && (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl mb-4">
                                            <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3 flex items-center">
                                                <Sparkles className="h-4 w-4 mr-1.5 text-indigo-400 animate-pulse" /> Explain your logic in plain English
                                            </label>
                                            <textarea
                                                rows={3}
                                                placeholder="e.g., If the AI score is less than 50..."
                                                className="w-full p-4 rounded-xl border outline-none text-sm bg-black/40 text-indigo-100 border-indigo-500/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 placeholder-indigo-800/50 transition-all font-medium resize-none shadow-inner"
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const prompt = e.target.value;
                                                        if (!prompt) return;
                                                        e.target.disabled = true;
                                                        const oldPlaceholder = e.target.placeholder;
                                                        e.target.placeholder = "Generating logic...";
                                                        e.target.value = "";
                                                        try {
                                                            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/ai/condition-builder`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ prompt })
                                                            });
                                                            const data = await res.json();
                                                            if (data.logic) {
                                                                updateNodeData(currentNode.id, {
                                                                    field: data.logic.field,
                                                                    operator: data.logic.operator,
                                                                    value: data.logic.value
                                                                });
                                                            }
                                                        } catch (err) {
                                                            console.error("AI Condition generation failed.", err);
                                                        } finally {
                                                            e.target.disabled = false;
                                                            e.target.placeholder = oldPlaceholder;
                                                            e.target.focus();
                                                        }
                                                    }
                                                }}
                                            />
                                            <p className="text-[10px] font-bold text-indigo-400/70 mt-3 uppercase tracking-wide flex items-center">
                                                <span className="px-1.5 py-0.5 bg-indigo-500/20 rounded mr-1.5">Enter</span> to apply logic
                                            </p>
                                        </div>

                                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 text-slate-400`}>Currently Evaluating</label>
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="bg-slate-900 border border-slate-700 text-amber-400 px-3 py-2 rounded-lg font-mono text-xs shadow-sm flex items-center">
                                                    <Database className="h-3 w-3 mr-1.5 opacity-70" />
                                                    {currentNode.data.field || 'No field selected'}
                                                </span>
                                                <span className="text-slate-500 font-black font-mono text-xs tracking-wider">
                                                    {(currentNode.data.operator || 'no_operator').toUpperCase().replace('_', ' ')}
                                                </span>
                                                <span className="bg-slate-900 border border-slate-700 text-green-400 px-3 py-2 rounded-lg font-mono text-xs shadow-sm">
                                                    {currentNode.data.value || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Specific */}
                                {configPanel.type === 'action' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Action Type</label>
                                            <select className={`w-full p-4 rounded-xl border outline-none ${t.testInput}`} value={currentNode.data.actionType} onChange={e => {
                                                const val = e.target.value;
                                                updateNodeData(currentNode.id, { actionType: val })
                                                updateNodeData(currentNode.id, {
                                                    label: val === 'Email' ? 'Send an Email' :
                                                        val === 'SMS' ? 'Send SMS Message' :
                                                            val === 'WhatsApp' ? 'Send WA Message' : 'Add to Log'
                                                })
                                            }}>
                                                <option value="Email">Send Email</option>
                                                <option value="WhatsApp">Send WhatsApp (Parent)</option>
                                                <option value="SMS">Send SMS (Parent)</option>
                                                <option value="Log">Internal Log</option>
                                            </select>
                                        </div>
                                        {currentNode.data.actionType === 'Email' && (
                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Target Email (Optional, overrides student email)</label>
                                                <div className="relative flex items-center">
                                                    <Mail size={16} className="absolute left-4 text-slate-500 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        inputMode="email"
                                                        placeholder="e.g. your_test_email@gmail.com"
                                                        className={`w-full p-4 pl-12 rounded-xl border outline-none transition-all ${t.testInput} focus:ring-2 focus:ring-indigo-500/20 ff-input`}
                                                        value={currentNode.data.email || ''}
                                                        onChange={e => updateNodeData(currentNode.id, { email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {currentNode.data.actionType === 'SMS' && (
                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Target Phone (Optional, overrides parent phone)</label>
                                                <div className="relative flex items-center">
                                                    <Bot size={16} className="absolute left-4 text-slate-500 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. +1234567890"
                                                        className={`w-full p-4 pl-12 rounded-xl border outline-none transition-all ${t.testInput} focus:ring-2 focus:ring-indigo-500/20 ff-input`}
                                                        value={currentNode.data.phone || ''}
                                                        onChange={e => updateNodeData(currentNode.id, { phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Message Body (use {'{{variable}}'})</label>
                                            <textarea className={`w-full p-4 rounded-xl border outline-none h-32 ${t.testInput}`} value={currentNode.data.message} onChange={e => updateNodeData(currentNode.id, { message: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className={`p-6 border-t transition-colors ${t.testFooter}`}>
                                <button onClick={closeConfigPanel} className={`w-full py-4 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-xl shadow-indigo-900/30`}>Save & Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {isTesting && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-end p-6 pointer-events-auto">
                        <div className={`w-full max-w-md h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${t.testPanel}`}>
                            <div className={`p-6 border-b flex items-center justify-between transition-colors ${t.testHeader}`}>
                                <div className="flex items-center"><div className="p-2 bg-indigo-600 rounded-lg mr-3"><Terminal className="h-5 w-5 text-white" /></div><h2 className={`text-xl font-bold transition-colors ${t.heading}`}>Simulation Mode</h2></div>
                                <button onClick={() => setIsTesting(false)} className="text-slate-400"><X /></button>
                            </div>
                            <div className="flex-1 p-8 space-y-6 overflow-y-auto">
                                <div><label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.subheading}`}>Input Assignment Text</label><textarea className={`w-full p-4 border rounded-xl outline-none h-32 text-sm ${t.testInput}`} value={testData.assignmentText} onChange={(e) => setTestData({ ...testData, assignmentText: e.target.value })} /></div>
                                <button onClick={runWorkflowTest} disabled={testLoading} className="w-full p-5 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-900/30">{testLoading ? 'Processing...' : 'Launch Execution'}</button>
                                {testResults && <div className="bg-slate-900 p-4 rounded-xl font-mono text-[10px] text-green-400 space-y-2">{testResults.logs?.map((l, i) => <div key={i}>&gt; {l}</div>)}</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
