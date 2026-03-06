import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, User, Bot, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function DashboardChatbot({ context }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I am your FusionFlow AI Guide. Ask me anything about your students or dashboard!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/ai/dashboard-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].slice(-10),
                    context: context // Pass real-time dashboard stats
                })
            });
            const data = await res.json();
            if (data.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Could not connect to the AI engine.' }]);
        } finally {
            setLoading(false);
        }
    };

    const toggleChat = () => setIsOpen(!isOpen);

    return (
        <div style={{ position: 'relative' }}>
            {/* Chat Trigger Button */}
            <button
                onClick={toggleChat}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(124, 58, 237, 0.45)',
                    transition: 'all 0.2s ease'
                }}
            >
                {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
                {isOpen ? 'Close Guide' : 'AI Dashboard Guide'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '120%',
                    right: '0',
                    width: '350px',
                    height: '500px',
                    backgroundColor: '#1e293b',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(124, 58, 237, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Sparkles size={18} color="#a78bfa" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '15px', fontWeight: '800' }}>AI Dashboard Guide</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Online</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.1) transparent'
                        }}
                    >
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                gap: '6px'
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                    background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
                                    color: msg.role === 'user' ? 'white' : '#e2e8f0',
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', gap: '8px', padding: '10px' }}>
                                <div className="dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                                <div className="dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                                <div className="dot" style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
                            </div>
                        )}
                        <style>{`
                            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                        `}</style>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} style={{
                        padding: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        gap: '10px'
                    }}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about the dashboard..."
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                color: 'white',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                border: 'none',
                                background: input.trim() ? '#4f46e5' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {loading ? <RotateCcw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
