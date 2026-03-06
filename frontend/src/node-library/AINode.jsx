import React from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

export default function AINode({ data, isConnectable }) {
    return (
        <div className="bg-white border-2 border-indigo-500 rounded-lg shadow-sm w-64">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" />
            <div className="bg-indigo-50 p-2 rounded-t-md flex items-center border-b border-indigo-100">
                <Bot className="h-4 w-4 text-indigo-600 mr-2" />
                <span className="font-semibold text-indigo-800 text-sm">AI Agent</span>
            </div>
            <div className="p-3">
                <div className="text-xs text-slate-500 font-medium">Model: {data.model || 'llama3-70b-8192'}</div>
                <div className="text-sm font-medium mt-1 text-slate-700 truncate">{data.label || 'AI Task'}</div>
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" />
        </div>
    );
}
