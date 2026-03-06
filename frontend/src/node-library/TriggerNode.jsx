import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play, Key, CheckCircle, AlertCircle } from 'lucide-react';

export default function TriggerNode({ data, isConnectable, selected }) {
    const linked = !!data.apiKey;

    return (
        <div
            className={`bg-white border-2 rounded-xl shadow-lg w-64 cursor-pointer transition-all duration-200
                ${selected ? 'border-green-500 ring-4 ring-green-100 shadow-green-100' : linked ? 'border-green-400' : 'border-green-300'}
            `}
            title="Click to configure trigger"
        >
            {/* Header */}
            <div className="bg-green-50 px-3 py-2.5 rounded-t-xl flex items-center justify-between border-b border-green-100">
                <div className="flex items-center">
                    <div className="p-1 bg-green-500 rounded-md mr-2">
                        <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                    <span className="font-black text-green-800 text-sm">Trigger</span>
                </div>
                {linked ? (
                    <span className="flex items-center text-[9px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" /> Linked
                    </span>
                ) : (
                    <span className="flex items-center text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <AlertCircle className="h-2.5 w-2.5 mr-1" /> Not linked
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
                <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Type</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        {data.triggerType === 'attendance' ? 'Attendance Marked' : 'Student Assignment Submission'}
                    </div>
                </div>
                {linked ? (
                    <div className="flex items-center bg-green-50 rounded-lg px-2.5 py-1.5 border border-green-100">
                        <Key className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        <span className="font-mono text-[10px] text-green-700 truncate">
                            {data.apiKey.substring(0, 8)}••••••••
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                        <Key className="h-3 w-3 text-amber-400 mr-2 flex-shrink-0" />
                        <span className="text-[10px] text-amber-600 italic">Click to paste API key</span>
                    </div>
                )}
                {data.teacherUsername && (
                    <div className="text-[10px] text-slate-500">
                        👤 Teacher: <span className="font-bold text-slate-700">{data.teacherUsername}</span>
                    </div>
                )}
                {typeof data.studentCount === 'number' && (
                    <div className="text-[10px] text-slate-500">
                        🎓 {data.studentCount} student{data.studentCount !== 1 ? 's' : ''} linked
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-green-500 border-2 border-white" />
        </div>
    );
}
