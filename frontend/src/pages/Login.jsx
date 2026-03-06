import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCircle, ArrowLeft, Zap } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [role, setRole] = useState(null); // 'teacher' | 'student'
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const endpoint = role === 'teacher'
                ? mode === 'signup' ? '/api/teacher/signup' : '/api/teacher/login'
                : '/api/student/login';

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
            } else {
                if (role === 'teacher' && mode === 'signup') {
                    setMode('login');
                    setError('');
                    setUsername('');
                    setPassword('');
                    alert('Account created! Please log in.');
                } else if (role === 'teacher') {
                    sessionStorage.setItem('teacher_session', JSON.stringify({
                        username: data.username || username,
                        id: data.id,
                        apiKey: data.apiKey || null,
                    }));
                    navigate('/teacher');
                } else {
                    sessionStorage.setItem('student', JSON.stringify({
                        id: data.id,
                        username,
                        email: data.email,
                        teacherId: data.teacherId,
                        apiKey: data.apiKey || null,
                    }));
                    navigate('/student');
                }
            }
        } catch (err) {
            setError('Cannot connect to server. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    if (!role) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
                <div className="flex items-center mb-16">
                    <Zap className="h-7 w-7 text-indigo-400 mr-3" />
                    <span className="text-2xl font-black text-white tracking-tight">FusionFlow</span>
                </div>
                <h1 className="text-4xl font-black text-white mb-3 text-center tracking-tight">Choose Your Portal</h1>
                <p className="text-slate-400 mb-12 text-center">Select your role to continue</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <button
                        onClick={() => { setRole('teacher'); setMode('login'); }}
                        className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 text-white p-8 rounded-3xl text-left transition-all hover:shadow-2xl hover:shadow-indigo-900/40 transform hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/50">
                            <UserCircle className="h-7 w-7 text-white" />
                        </div>
                        <h2 className="text-xl font-black mb-2">Teacher Console</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">Sign up and manage your classroom. Create student accounts, link AI workflows, and see real-time grades.</p>
                        <div className="mt-6 text-indigo-400 text-sm font-bold">Enter Console →</div>
                    </button>

                    <button
                        onClick={() => { setRole('student'); setMode('login'); }}
                        className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 text-white p-8 rounded-3xl text-left transition-all hover:shadow-2xl hover:shadow-green-900/40 transform hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-green-900/50">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <h2 className="text-xl font-black mb-2">Student Portal</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">Log in with your teacher-provided credentials. Submit assignments and track your AI-generated scores.</p>
                        <div className="mt-6 text-green-400 text-sm font-bold">Enter Portal →</div>
                    </button>
                </div>
            </div>
        );
    }

    const isTeacher = role === 'teacher';
    const accent = isTeacher ? 'indigo' : 'green';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <button onClick={() => setRole(null)} className="flex items-center text-slate-400 hover:text-white mb-8 text-sm font-bold transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to portal selection
                </button>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl backdrop-blur-sm">
                    <div className={`w-14 h-14 ${isTeacher ? 'bg-indigo-600' : 'bg-green-600'} rounded-2xl flex items-center justify-center mb-8`}>
                        {isTeacher ? <UserCircle className="h-7 w-7 text-white" /> : <GraduationCap className="h-7 w-7 text-white" />}
                    </div>

                    <h2 className="text-2xl font-black text-white mb-1">
                        {isTeacher ? (mode === 'signup' ? 'Create Teacher Account' : 'Teacher Login') : 'Student Login'}
                    </h2>
                    <p className="text-slate-400 text-sm mb-8">
                        {isTeacher ? (mode === 'signup' ? 'Register once to manage your classroom.' : 'Access your dashboard and manage students.') : 'Log in with credentials provided by your teacher.'}
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm mb-6 font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                            <input
                                required
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all text-sm"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                            <input
                                required
                                type="password"
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all text-sm"
                                placeholder="Enter password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-black text-white transition-all text-sm shadow-xl ${loading ? 'bg-slate-600 cursor-not-allowed' : isTeacher ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40' : 'bg-green-600 hover:bg-green-500 shadow-green-900/40'}`}
                        >
                            {loading ? 'Processing...' : isTeacher ? (mode === 'signup' ? 'Create Account' : 'Sign In') : 'Sign In'}
                        </button>
                    </form>

                    {isTeacher && (
                        <p className="text-center text-slate-500 text-sm mt-6">
                            {mode === 'login' ? (
                                <>First time? <button onClick={() => { setMode('signup'); setError(''); }} className="text-indigo-400 font-bold hover:underline">Create an account</button></>
                            ) : (
                                <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} className="text-indigo-400 font-bold hover:underline">Sign in</button></>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
