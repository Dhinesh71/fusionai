import React from 'react';
import { Handle, Position } from 'reactflow';
import { Split } from 'lucide-react';

export default function ConditionNode({ data, isConnectable }) {
    return (
        <div className="bg-white border-2 border-amber-500 rounded-lg shadow-sm w-64">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-amber-500" />
            <div className="bg-amber-50 p-2 rounded-t-md flex items-center border-b border-amber-100">
                <Split className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-semibold text-amber-800 text-sm">Condition</span>
            </div>
            <div className="p-3 text-center">
                <div className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                    IF {data.field || 'input'} {data.operator || '=='} {data.value || 'true'}
                </div>
            </div>
            <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} isConnectable={isConnectable} className="w-2 h-2 bg-green-500" />
            <div className="absolute right-[-24px] top-[22%] text-[10px] text-slate-500">True</div>

            <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} isConnectable={isConnectable} className="w-2 h-2 bg-red-500" />
            <div className="absolute right-[-25px] top-[62%] text-[10px] text-slate-500">False</div>
        </div>
    );
}
