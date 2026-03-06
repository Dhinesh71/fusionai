import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Sparkles, GraduationCap, LayoutGrid, RotateCcw,
    Play, Square, Zap, AlertCircle, CheckCircle, Clock, Edit3, Trash2
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function StatusBadge({ status }) {
    if (status === 'running') return (
        <span className="flex items-center text-xs font-black text-green-500 uppercase tracking-wider">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            Running
        </span>
    );
    if (status === 'draft') return (
        <span className="flex items-center text-xs font-black text-slate-400 uppercase tracking-wider">
            <span className="w-2 h-2 bg-slate-400 rounded-full mr-1.5" />
            Draft
        </span>
    );
    return (
        <span className="flex items-center text-xs font-black text-slate-400 uppercase tracking-wider">
            <span className="w-2 h-2 bg-slate-300 rounded-full mr-1.5" />
            Stopped
        </span>
    );
}

export default function WorkflowList() {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState({}); // { [wfId]: true }
    const [deleteTarget, setDeleteTarget] = useState(null); // workflow to confirm-delete
    const [deleting, setDeleting] = useState(false);
    const timerRef = useRef(null);

    const fetchWorkflows = async () => {
        try {
            const res = await fetch(`${API}/api/workflows`);
            const data = await res.json();
            setWorkflows(data);
        } catch {
            console.error('Failed to fetch workflows');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
        // Poll every 5s to reflect status changes
        timerRef.current = setInterval(fetchWorkflows, 5000);
        return () => clearInterval(timerRef.current);
    }, []);

    const toggleWorkflow = async (wf, e) => {
        e.stopPropagation();
        const nextStatus = wf.status === 'running' ? 'stopped' : 'running';
        setToggling(t => ({ ...t, [wf.id]: true }));
        try {
            if (nextStatus === 'running') {
                await fetch(`${API}/api/workflows/${wf.id}/run`, { method: 'POST' });
            } else {
                await fetch(`${API}/api/workflows/${wf.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'stopped' }),
                });
            }
            // Optimistic update
            setWorkflows(ws => ws.map(w => w.id === wf.id ? { ...w, status: nextStatus } : w));
        } catch {
            alert('Failed to update workflow status. Is the backend running?');
        } finally {
            setToggling(t => ({ ...t, [wf.id]: false }));
        }
    };

    const deleteWorkflow = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await fetch(`${API}/api/workflows/${deleteTarget.id}`, { method: 'DELETE' });
            setWorkflows(ws => ws.filter(w => w.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch {
            alert('Failed to delete workflow. Is the backend running?');
        } finally {
            setDeleting(false);
        }
    };

    const runningCount = workflows.filter(w => w.status === 'running').length;

    return (
        <div className="p-8 w-full max-w-6xl mx-auto overflow-y-auto h-full pb-20">

            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Automation Builder</h1>
                    <p className="text-slate-500 mt-1 font-medium">Build, activate, and monitor your AI grading workflows.</p>
                    {runningCount > 0 && (
                        <div className="flex items-center mt-3 px-4 py-2 bg-green-50 border border-green-100 rounded-xl w-fit">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                            <span className="text-sm font-bold text-green-700">{runningCount} workflow{runningCount !== 1 ? 's' : ''} running live</span>
                        </div>
                    )}
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchWorkflows}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors border border-slate-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50"
                        title="Refresh"
                    >
                        <RotateCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/builder')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black flex items-center shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Workflow
                    </button>
                </div>
            </div>

            {/* Workflow Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                    <RotateCcw className="h-6 w-6 animate-spin mr-3" /> Loading workflows...
                </div>
            ) : workflows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                    {workflows.map(wf => {
                        const isRunning = wf.status === 'running';
                        const isToggling = !!toggling[wf.id];
                        return (
                            <div
                                key={wf.id}
                                className={`relative rounded-3xl border shadow-sm transition-all duration-300 overflow-hidden group
                                    ${isRunning
                                        ? 'bg-white border-green-200 shadow-green-100 hover:shadow-xl hover:shadow-green-100'
                                        : 'bg-white border-slate-100 hover:shadow-xl hover:border-slate-200'
                                    }`}
                            >
                                {/* Running glow strip */}
                                {isRunning && (
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 animate-pulse" />
                                )}

                                <div className="p-6">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className={`p-3 rounded-2xl ${isRunning ? 'bg-green-50' : 'bg-indigo-50'}`}>
                                            <Zap className={`h-6 w-6 ${isRunning ? 'text-green-500' : 'text-indigo-500'}`} />
                                        </div>
                                        <StatusBadge status={wf.status} />
                                    </div>

                                    {/* Name */}
                                    <h3 className="text-lg font-black text-slate-800 mb-1 truncate">
                                        {wf.name || 'Untitled Workflow'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-5">
                                        {wf.nodes?.length || 0} nodes · {isRunning ? 'Grading submissions automatically' : 'Not currently grading'}
                                    </p>

                                    {/* Timestamps */}
                                    {isRunning && wf.started_at && (
                                        <div className="flex items-center text-xs text-green-600 font-medium mb-4">
                                            <Clock className="h-3 w-3 mr-1.5" />
                                            Running since {new Date(wf.started_at).toLocaleTimeString()}
                                        </div>
                                    )}
                                    {!isRunning && wf.stopped_at && (
                                        <div className="flex items-center text-xs text-slate-400 font-medium mb-4">
                                            <Clock className="h-3 w-3 mr-1.5" />
                                            Stopped at {new Date(wf.stopped_at).toLocaleTimeString()}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex space-x-3 pt-4 border-t border-slate-50">
                                        {/* Run / Stop toggle */}
                                        <button
                                            onClick={(e) => toggleWorkflow(wf, e)}
                                            disabled={isToggling}
                                            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-2xl font-black text-sm transition-all
                                                ${isRunning
                                                    ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100'
                                                    : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-200'
                                                } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isToggling ? (
                                                <RotateCcw className="h-4 w-4 animate-spin mr-2" />
                                            ) : isRunning ? (
                                                <Square className="h-4 w-4 mr-2 fill-red-500" />
                                            ) : (
                                                <Play className="h-4 w-4 mr-2 fill-white" />
                                            )}
                                            {isToggling ? '...' : isRunning ? 'Stop' : 'Run Workflow'}
                                        </button>

                                        {/* Edit */}
                                        <button
                                            onClick={() => navigate(`/builder/${wf.id}`)}
                                            className="p-2.5 rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                            title="Edit workflow"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(wf); }}
                                            className="p-2.5 rounded-2xl border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                                            title="Delete workflow"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-20 flex flex-col items-center justify-center text-center mb-20">
                    <div className="p-5 bg-slate-50 rounded-2xl mb-4">
                        <LayoutGrid className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">No workflows yet</h3>
                    <p className="text-slate-500 max-w-sm mt-3 leading-relaxed text-sm">
                        Create a workflow below, link it to your Teacher Dashboard via the Trigger node, then hit <strong>Run</strong> to activate it.
                    </p>
                    <button
                        onClick={() => navigate('/builder')}
                        className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all"
                    >
                        + Create First Workflow
                    </button>
                </div>
            )}

            {/* How it works banner */}
            {workflows.some(w => w.status !== 'running') && workflows.length > 0 && (
                <div className="mb-16 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-amber-800 mb-1">Some workflows are stopped</p>
                        <p className="text-amber-700">Student submissions will show <strong>"No active workflow"</strong> until you press <strong>Run Workflow</strong> on a linked workflow.</p>
                    </div>
                </div>
            )}


            {/* ── Delete Confirmation Modal ─────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
                        <div className="flex items-center mb-4">
                            <div className="p-3 bg-red-100 rounded-2xl mr-4">
                                <Trash2 className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Delete Workflow?</h3>
                                <p className="text-sm text-slate-500">This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 mb-6">
                            <p className="font-bold text-slate-700 truncate">{deleteTarget.name || 'Untitled Workflow'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{deleteTarget.nodes?.length || 0} nodes · {deleteTarget.status}</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteWorkflow}
                                disabled={deleting}
                                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
