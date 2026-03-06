import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Workflow, Settings, Zap, ShieldCheck } from 'lucide-react';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen bg-slate-50">
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-4 flex items-center space-x-2">
                    <Zap className="h-6 w-6 text-indigo-400" />
                    <span className="text-xl font-bold">FusionFlow</span>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-2">
                    <Link to="/" className="flex items-center px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-md transition-colors">
                        <LayoutDashboard className="h-5 w-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link to="/builder" className="flex items-center px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-md transition-colors">
                        <Workflow className="h-5 w-5 mr-3" />
                        New Workflow
                    </Link>




                </nav>
            </aside>
            <main className="flex-1 overflow-hidden flex flex-col">
                <Outlet />
            </main>
        </div>
    );
}
