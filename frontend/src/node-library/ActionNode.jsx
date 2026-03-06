import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, Mail } from 'lucide-react';

export default function ActionNode({ data, isConnectable }) {
    return (
        <div className="bg-white border-2 border-rose-400 rounded-lg shadow-sm w-64">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-rose-400" />
            <div className="bg-rose-50 p-2 rounded-t-md flex items-center border-b border-rose-100">
                <Zap className="h-4 w-4 text-rose-600 mr-2" />
                <span className="font-semibold text-rose-800 text-sm">Action</span>
            </div>
            <div className="p-3">
                <div className="text-xs text-slate-500 font-medium capitalize">Type: {data.actionType || 'Send Email'}</div>
                <div className="text-sm font-bold mt-1 text-slate-800 truncate">{data.label || 'Execute task'}</div>
                {data.actionType === 'Email' && (
                    <div className="mt-3 py-1 px-2 bg-rose-50/50 border border-rose-100 rounded text-[10px] text-rose-600 font-bold flex items-center w-fit">
                        <Mail className="h-3 w-3 mr-1.5 opacity-70" />
                        <span className="opacity-60 mr-1.5 font-black uppercase">To:</span>
                        {data.email || 'Student Email (Auto)'}
                    </div>
                )}
                {data.actionType === 'SMS' && (
                    <div className="mt-3 py-1 px-2 bg-rose-50/50 border border-rose-100 rounded text-[10px] text-rose-600 font-bold flex items-center w-fit">
                        <Zap className="h-3 w-3 mr-1.5 opacity-70" />
                        <span className="opacity-60 mr-1.5 font-black uppercase">To:</span>
                        {data.phone || 'Parent Phone (Auto)'}
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-rose-400" />
        </div>
    );
}
