import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, LogOut, Clock, CheckCircle, Zap,
    UploadCloud, FileText, FileType, Presentation, X, AlertCircle,
    Plus, RotateCcw, Play, Square, Edit3, Trash2, Wand2, LayoutGrid,
    Key, Copy, Eye, EyeOff, ChevronRight, Sparkles, Shield, Activity, BookOpen,
    Megaphone, Bell, Paperclip, Download
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.txt';

const FILE_ICONS = {
    pdf: { icon: FileText, color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'PDF' },
    doc: { icon: FileType, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Word' },
    docx: { icon: FileType, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Word' },
    ppt: { icon: Presentation, color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'PPT' },
    pptx: { icon: Presentation, color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'PPT' },
    txt: { icon: FileText, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Text' },
};
const getFileInfo = (name) => FILE_ICONS[name.split('.').pop().toLowerCase()] || FILE_ICONS.txt;
const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

function StatusPill({ status }) {
    if (status === 'running') return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />Live
        </span>
    );
    if (status === 'draft') return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, background: '#94a3b8', borderRadius: '50%' }} />Draft
        </span>
    );
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, background: '#64748b', borderRadius: '50%' }} />Stopped
        </span>
    );
}

const NAV_ITEMS = [
    { id: 'assignments', label: 'My Assignments', icon: BookOpen },
    { id: 'attendance', label: 'My Attendance', icon: Activity },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'automation', label: 'Automation Builder', icon: Zap },
    { id: 'apikey', label: 'API Key', icon: Key },
];

const CATEGORY_COLORS = {
    General: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
    Syllabus: { bg: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
    Assignment: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
    Exam: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    Other: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
};

export default function StudentDashboard() {
    const navigate = useNavigate();
    const raw = sessionStorage.getItem('student');
    const student = raw ? JSON.parse(raw) : null;

    const [tab, setTab] = useState('assignments');
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);

    const [workflows, setWorkflows] = useState([]);
    const [wfLoading, setWfLoading] = useState(false);
    const [toggling, setToggling] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [apiKey, setApiKey] = useState(student?.apiKey || '');
    const [showKey, setShowKey] = useState(false);

    const [attSummary, setAttSummary] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
    const [exportFrom, setExportFrom] = useState(new Date().toISOString().split('T')[0]);
    const [exportTo, setExportTo] = useState(new Date().toISOString().split('T')[0]);

    // ── Announcements state ──
    const [announcements, setAnnouncements] = useState([]);
    const [annLoading, setAnnLoading] = useState(false);
    // Track how many were seen last time via sessionStorage
    const seenKey = `ann_seen_${student?.id}`;
    const [seenCount, setSeenCount] = useState(() => parseInt(sessionStorage.getItem(`ann_seen_${student?.id}`) || '0', 10));

    useEffect(() => {
        if (!student) { navigate('/login'); return; }
        fetchSubmissions();
        fetchAnnouncements();
        fetchAttendance();
        timerRef.current = setInterval(() => {
            fetchSubmissions();
            fetchAttendance();
        }, 5000);
        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (tab === 'automation') fetchWorkflows();
        if (tab === 'attendance') fetchAttendance();
        if (tab === 'announcements') {
            fetchAnnouncements();
            // Mark all as seen
            sessionStorage.setItem(seenKey, String(announcements.length));
            setSeenCount(announcements.length);
        }
    }, [tab]);

    const fetchSubmissions = async () => {
        if (!student) return;
        try {
            const res = await fetch(`${API}/api/submissions/student/${student.username}`);
            const data = await res.json();
            if (Array.isArray(data)) setSubmissions(data);
        } catch { }
    };

    const fetchAnnouncements = async () => {
        if (!student?.teacherId) return;
        setAnnLoading(true);
        try {
            const res = await fetch(`${API}/api/announcements/student/${student.teacherId}`);
            const data = await res.json();
            if (Array.isArray(data)) setAnnouncements(data);
        } catch { }
        finally { setAnnLoading(false); }
    };

    const fetchWorkflows = async () => {
        setWfLoading(true);
        try {
            const studentId = student?.id;
            if (!studentId) { setWorkflows([]); return; }
            const res = await fetch(`${API}/api/workflows?studentId=${studentId}`);
            const data = await res.json();
            setWorkflows(Array.isArray(data) ? data : []);
        } catch { setWorkflows([]); }
        finally { setWfLoading(false); }
    };

    const generateApiKey = async () => {
        try {
            const res = await fetch(`${API}/api/student/generate-key`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentUsername: student.username }),
            });
            const data = await res.json();
            if (res.ok) {
                setApiKey(data.key); setShowKey(true);
                sessionStorage.setItem('student', JSON.stringify({ ...student, apiKey: data.key }));
            }
        } catch { alert('Failed to generate key. Is the backend running?'); }
    };

    const fetchAttendance = async () => {
        if (!student?.id) return;
        try {
            const res = await fetch(`${API}/api/student/attendance/summary?studentId=${student.id}`);
            const data = await res.json();
            if (data && !data.error) setAttSummary(data);
        } catch { }
    };

    const handleFile = (f) => {
        setError('');
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'].includes(ext))
            return setError('Unsupported file type. Please upload PDF, DOCX, PPT, or TXT.');
        if (f.size > 20 * 1024 * 1024)
            return setError('File too large. Maximum 20 MB.');
        setFile(f);
    };

    const onDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

    const submitAssignment = async (e) => {
        e.preventDefault();
        if (!file) return setError('Please select a file to upload.');
        setLoading(true); setError('');
        try {
            const fd = new FormData();
            fd.append('assignment', file);
            fd.append('studentUsername', student.username);
            const res = await fetch(`${API}/api/submit-file`, { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) { setFile(null); fetchSubmissions(); }
            else setError(data.error || 'Upload failed. Please try again.');
        } catch { setError('Cannot connect to server. Is the backend running?'); }
        finally { setLoading(false); }
    };

    const toggleWorkflow = async (wf, e) => {
        e.stopPropagation();
        const nextStatus = wf.status === 'running' ? 'stopped' : 'running';
        setToggling(t => ({ ...t, [wf.id]: true }));
        try {
            if (nextStatus === 'running') await fetch(`${API}/api/workflows/${wf.id}/run`, { method: 'POST' });
            else await fetch(`${API}/api/workflows/${wf.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'stopped' }) });
            setWorkflows(ws => ws.map(w => w.id === wf.id ? { ...w, status: nextStatus } : w));
        } catch { alert('Failed to update workflow status.'); }
        finally { setToggling(t => ({ ...t, [wf.id]: false })); }
    };

    const deleteWorkflow = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await fetch(`${API}/api/workflows/${deleteTarget.id}`, { method: 'DELETE' });
            setWorkflows(ws => ws.filter(w => w.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch { alert('Failed to delete workflow.'); }
        finally { setDeleting(false); }
    };

    const logout = () => { sessionStorage.removeItem('student'); navigate('/login'); };

    const fileInfo = file ? getFileInfo(file.name) : null;
    const FileIcon = fileInfo?.icon;
    const runningCount = workflows.filter(w => w.status === 'running').length;
    const graded = submissions.filter(s => s.status === 'Completed').length;
    const avgScore = submissions.filter(s => s.score).length
        ? (submissions.reduce((a, s) => a + (parseInt(s.score) || 0), 0) / submissions.filter(s => s.score).length).toFixed(1)
        : '—';

    const S = styles;

    return (
        <div style={S.root}>
            <style>{globalStyles}</style>

            {/* ── Sidebar ── */}
            <aside style={S.sidebar}>
                <div style={S.sidebarLogo}>
                    <div style={S.logoIcon}><Zap size={18} color="#fff" /></div>
                    <span style={S.logoText}>FusionFlow</span>
                </div>

                <div style={S.sidebarSection}>
                    <p style={S.sidebarLabel}>STUDENT PORTAL</p>
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const active = tab === item.id;
                        const unread = item.id === 'announcements' ? Math.max(0, announcements.length - seenCount) : 0;
                        return (
                            <button key={item.id} onClick={() => { setTab(item.id); if (item.id === 'automation') fetchWorkflows(); }} style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}>
                                <div style={{ ...S.navIcon, ...(active ? S.navIconActive : {}) }}><Icon size={16} /></div>
                                <span style={S.navLabel}>{item.label}</span>
                                {unread > 0 && (
                                    <span style={{ width: 18, height: 18, background: '#ef4444', borderRadius: '50%', fontSize: 10, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unread}</span>
                                )}
                                {active && !unread && <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#34d399' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Sidebar Stats */}
                <div style={S.sidebarStats}>
                    <p style={S.sidebarLabel}>QUICK STATS</p>
                    {[
                        { label: 'Submissions', value: submissions.length, color: '#818cf8' },
                        { label: 'Attendance', value: `${attSummary.percentage}%`, color: attSummary.percentage >= 75 ? '#10b981' : attSummary.percentage >= 50 ? '#fbbf24' : '#ef4444' },
                        { label: 'Avg Score', value: avgScore, color: '#fbbf24' },
                    ].map(s => (
                        <div key={s.label} style={S.sidebarStatItem}>
                            <span style={{ color: '#475569', fontSize: 12 }}>{s.label}</span>
                            <span style={{ color: s.color, fontWeight: 800, fontSize: 14 }}>{s.value}</span>
                        </div>
                    ))}
                </div>

                <div style={S.sidebarFooter}>
                    <div style={S.studentCard}>
                        <div style={{ ...S.studentAvatar, background: `hsl(${(student?.username?.charCodeAt(0) || 65) * 7 % 360},60%,50%)` }}>
                            {student?.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={S.studentName}>{student?.username}</p>
                            <p style={S.studentRole}>{student?.email || 'Student'}</p>
                        </div>
                        <button onClick={logout} style={S.logoutBtn} title="Logout">
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main style={S.main}>

                {/* Header */}
                <header style={S.header}>
                    <div>
                        <h1 style={S.pageTitle}>{NAV_ITEMS.find(n => n.id === tab)?.label}</h1>
                        <p style={S.pageSubtitle}>Student Portal · FusionFlow AI Platform</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {tab === 'assignments' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20 }}>
                                <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Auto-grading active</span>
                            </div>
                        )}
                        {tab === 'automation' && (
                            <button onClick={() => navigate('/builder')} style={S.primaryBtn}>
                                <Plus size={16} />Create Workflow
                            </button>
                        )}
                    </div>
                </header>

                <div style={S.content}>
                    {/* ── Attendance Tab ── */}
                    {tab === 'attendance' && (
                        <div style={{ maxWidth: 800 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                <div style={{ ...S.card, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Activity size={30} color="#10b981" />
                                    </div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Attendance</p>
                                    <p style={{ fontSize: 48, fontWeight: 900, color: attSummary.percentage >= 75 ? '#10b981' : attSummary.percentage >= 50 ? '#fbbf24' : '#ef4444', margin: '8px 0' }}>{attSummary.percentage}%</p>
                                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
                                        <div style={{ width: `${attSummary.percentage}%`, height: '100%', background: attSummary.percentage >= 75 ? '#10b981' : attSummary.percentage >= 50 ? '#fbbf24' : '#ef4444', transition: 'width 1s ease' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    <div style={{ ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={16} color="#10b981" /></div>
                                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Present Days</span>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{attSummary.present}</span>
                                    </div>
                                    <div style={{ ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color="#ef4444" /></div>
                                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Absent Days</span>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{attSummary.absent}</span>
                                    </div>
                                    <div style={{ ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutGrid size={16} color="#818cf8" /></div>
                                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Total Sessions</span>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: '#818cf8' }}>{attSummary.total}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ ...S.card, padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} color="#22c55e" /></div>
                                    <div>
                                        <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>Attendance Summary</p>
                                        <p style={{ color: '#64748b', fontSize: 12 }}>Your track record in the current academic period</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { label: 'Exceeding 75%', active: attSummary.percentage >= 75, color: '#10b981', text: 'You are on track! Keep up the good work.' },
                                        { label: 'Warning Range (50-75%)', active: attSummary.percentage >= 50 && attSummary.percentage < 75, color: '#fbbf24', text: 'Your attendance is slightly low. Try to attend more classes.' },
                                        { label: 'Critical Range (< 50%)', active: attSummary.percentage < 50 && attSummary.total > 0, color: '#ef4444', text: 'Your attendance is critically low. Please meet your teacher.' },
                                    ].filter(r => r.active).map(r => (
                                        <div key={r.label} style={{ padding: '12px 16px', borderRadius: 12, background: `${r.color}08`, border: `1px solid ${r.color}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                                            <p style={{ fontSize: 13, color: r.color, fontWeight: 600 }}>{r.text}</p>
                                        </div>
                                    ))}
                                    {attSummary.total === 0 && (
                                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569' }}>
                                            <Activity size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                                            <p style={{ fontSize: 14 }}>No attendance sessions recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ ...S.card, padding: 24, marginTop: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#818cf8" /></div>
                                    <div>
                                        <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>Export Attendance Report</p>
                                        <p style={{ color: '#64748b', fontSize: 12 }}>Download your detailed attendance history as Excel/CSV</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>From Date</label>
                                        <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#f1f5f9', fontSize: 13 }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>To Date</label>
                                        <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#f1f5f9', fontSize: 13 }} />
                                    </div>
                                    <button
                                        onClick={() => window.open(`${API}/api/student/attendance/export?studentId=${student.id}&from=${exportFrom}&to=${exportTo}`, '_blank')}
                                        style={{ height: 42, padding: '0 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
                                    >
                                        <Download size={16} /> Export as Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Announcements Tab ── */}
                    {tab === 'announcements' && (
                        <div>
                            {/* Header bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, marginBottom: 24 }}>
                                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Megaphone size={18} color="#fff" />
                                </div>
                                <div>
                                    <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>Announcements from your Teacher</p>
                                    <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} · Syllabus, assignments, exams &amp; more</p>
                                </div>
                            </div>

                            {annLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                    <RotateCcw size={24} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
                                    <p style={{ color: '#64748b', marginTop: 12 }}>Loading announcements...</p>
                                </div>
                            ) : !student?.teacherId ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
                                    <Bell size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
                                    <p style={{ color: '#64748b', fontSize: 14 }}>No teacher linked to your account.</p>
                                    <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Contact your teacher to be added as a student.</p>
                                </div>
                            ) : announcements.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
                                    <Megaphone size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
                                    <p style={{ color: '#64748b', fontSize: 14 }}>No announcements yet.</p>
                                    <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Your teacher hasn't posted anything yet — check back soon!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {announcements.map((ann, idx) => {
                                        const c = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.General;
                                        const isNew = idx < (announcements.length - seenCount);
                                        return (
                                            <div key={ann.id} style={{
                                                padding: '20px 22px', borderRadius: 18,
                                                background: 'rgba(255,255,255,0.035)',
                                                border: `1px solid ${c.border}`,
                                                animation: 'fadeIn 0.4s ease',
                                                position: 'relative',
                                                boxShadow: isNew ? `0 0 0 1px ${c.border}, 0 8px 32px ${c.bg}` : 'none',
                                            }}>
                                                {isNew && (
                                                    <span style={{ position: 'absolute', top: 14, right: 14, padding: '2px 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, fontSize: 9, fontWeight: 900, color: '#f87171', letterSpacing: '0.08em' }}>NEW</span>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                                                        {ann.category}
                                                    </span>
                                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{ann.title}</h3>
                                                </div>
                                                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{ann.body}</p>

                                                {ann.attachment_url && (
                                                    <div style={{ marginBottom: 16 }}>
                                                        <a href={`${API}${ann.attachment_url}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s', cursor: 'pointer' }} className="wf-card">
                                                                <div style={{ width: 30, height: 30, background: 'rgba(16,185,129,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Paperclip size={16} color="#34d399" />
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{ann.attachment_name || 'Attached Material'}</p>
                                                                    <p style={{ fontSize: 10, color: '#34d399', fontWeight: 800 }}>DOWNLOAD / VIEW</p>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}

                                                <p style={{ fontSize: 11, color: '#334155' }}>
                                                    📅 {new Date(ann.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Assignments Tab ── */}
                    {tab === 'assignments' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                            {/* Upload Card */}
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.headerIcon, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                            <UploadCloud size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <p style={S.cardTitle}>Submit Assignment</p>
                                            <p style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>AI reads & grades automatically</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: 24 }}>
                                    <form onSubmit={submitAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {!file ? (
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                                onDragLeave={() => setDragging(false)}
                                                onDrop={onDrop}
                                                style={{
                                                    border: `2px dashed ${dragging ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                                    background: dragging ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                                                    borderRadius: 16, padding: '40px 20px',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                                                    transform: dragging ? 'scale(1.01)' : 'scale(1)',
                                                }}
                                            >
                                                <div style={{ width: 56, height: 56, background: 'rgba(16,185,129,0.12)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                                    <UploadCloud size={26} color="#10b981" />
                                                </div>
                                                <p style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 4 }}>Drag & drop your file here</p>
                                                <p style={{ color: '#475569', fontSize: 13, marginBottom: 14 }}>or click to browse files</p>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {['PDF', 'DOCX', 'PPT', 'TXT'].map(t => (
                                                        <span key={t} style={{ padding: '3px 9px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 10, fontWeight: 800, color: '#64748b', border: '1px solid rgba(255,255,255,0.07)', letterSpacing: '0.05em' }}>{t}</span>
                                                    ))}
                                                </div>
                                                <p style={{ color: '#334155', fontSize: 11, marginTop: 10 }}>Max file size: 20 MB</p>
                                                <input ref={fileInputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14 }}>
                                                <div style={{ width: 42, height: 42, background: fileInfo.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <FileIcon size={20} style={{ color: fileInfo.color }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                                                    <p style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{fileInfo.label} · {fmtSize(file.size)}</p>
                                                </div>
                                                <button type="button" onClick={() => setFile(null)} style={{ color: '#475569', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {error && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#f87171', fontSize: 13 }}>
                                                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{error}
                                            </div>
                                        )}

                                        <button
                                            type="submit" disabled={loading || !file}
                                            style={{
                                                padding: '14px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 14, cursor: loading || !file ? 'not-allowed' : 'pointer',
                                                background: loading || !file ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#10b981,#059669)',
                                                color: loading || !file ? '#475569' : '#fff',
                                                boxShadow: loading || !file ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s',
                                            }}
                                        >
                                            {loading ? (
                                                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Uploading & AI Grading…</>
                                            ) : <>⚡ Submit for AI Grading</>}
                                        </button>
                                        <p style={{ textAlign: 'center', color: '#334155', fontSize: 12 }}>Your file will be extracted and evaluated by AI. Score appears live below.</p>
                                    </form>
                                </div>
                            </div>

                            {/* Submission History */}
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.headerIcon, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                            <Activity size={16} color="#fff" />
                                        </div>
                                        <p style={S.cardTitle}>Your Submissions</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Live</span>
                                    </div>
                                </div>
                                <div style={{ padding: 24 }}>
                                    {submissions.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: '#334155' }}>
                                            <GraduationCap size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                                            <p style={{ fontSize: 14 }}>No submissions yet.</p>
                                            <p style={{ fontSize: 12, color: '#1e293b', marginTop: 4 }}>Upload your first assignment!</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
                                            {[...submissions].reverse().map(sub => {
                                                const text = sub.assignment_text || sub.assignmentText || '';
                                                const isCompleted = sub.status === 'Completed';
                                                const isFailed = sub.status === 'Failed';
                                                return (
                                                    <div key={sub.id} style={{
                                                        padding: '14px 16px', borderRadius: 14, border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                                        background: isCompleted ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                                                        transition: 'all 0.2s',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                                                                <p style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                    {text ? text.substring(0, 100) + (text.length > 100 ? '…' : '') : '📄 File submission'}
                                                                </p>
                                                                <p style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>
                                                                    {new Date(sub.submitted_at || sub.submittedAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            {sub.score != null ? (
                                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
                                                                        <span style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>{sub.score}</span>
                                                                        <span style={{ fontSize: 11, color: '#475569', marginLeft: 3 }}>/100</span>
                                                                    </div>
                                                                    <CheckCircle size={12} color="#10b981" style={{ marginLeft: 'auto', display: 'block' }} />
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                                    <div style={{ width: 14, height: 14, border: '2px solid #fbbf24', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                                    Grading…
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                                                            background: isCompleted ? 'rgba(16,185,129,0.12)' : isFailed ? 'rgba(239,68,68,0.12)' : sub.status?.includes('No active') ? 'rgba(100,116,139,0.12)' : 'rgba(245,158,11,0.12)',
                                                            color: isCompleted ? '#10b981' : isFailed ? '#f87171' : sub.status?.includes('No active') ? '#64748b' : '#fbbf24',
                                                            border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.25)' : isFailed ? 'rgba(239,68,68,0.25)' : sub.status?.includes('No active') ? 'rgba(100,116,139,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                                        }}>{sub.status}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Automation Tab ── */}
                    {tab === 'automation' && (
                        <div>
                            {runningCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, marginBottom: 20 }}>
                                    <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>{runningCount} workflow{runningCount !== 1 ? 's' : ''} running live</span>
                                </div>
                            )}

                            {!apiKey && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, marginBottom: 20 }}>
                                    <Key size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Generate your API Key first</p>
                                        <p style={{ color: '#94a3b8', fontSize: 13 }}>Go to the <button onClick={() => setTab('apikey')} style={{ color: '#34d399', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>API Key</button> tab to generate your personal key.</p>
                                    </div>
                                </div>
                            )}

                            {wfLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                    <RotateCcw size={24} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                                    <p style={{ color: '#64748b', marginTop: 12 }}>Loading your workflows...</p>
                                </div>
                            ) : workflows.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
                                    {workflows.map(wf => {
                                        const isRunning = wf.status === 'running';
                                        const isToggling = !!toggling[wf.id];
                                        return (
                                            <div key={wf.id} style={{
                                                borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.04)',
                                                border: isRunning ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                            }} className="wf-card">
                                                {isRunning && <div style={{ height: 3, background: 'linear-gradient(90deg,#22c55e,#10b981,#22c55e)', animation: 'pulse 2s infinite' }} />}
                                                <div style={{ padding: 20 }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                                                        <div style={{ width: 46, height: 46, borderRadius: 14, background: isRunning ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Zap size={22} color={isRunning ? '#22c55e' : '#64748b'} />
                                                        </div>
                                                        <StatusPill status={wf.status} />
                                                    </div>
                                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wf.name || 'Untitled Workflow'}</h3>
                                                    <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>{wf.nodes?.length || 0} nodes · {isRunning ? 'Live & active' : 'Not active'}</p>
                                                    <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <button onClick={(e) => toggleWorkflow(wf, e)} disabled={isToggling}
                                                            style={{
                                                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, transition: 'all 0.2s', cursor: 'pointer', opacity: isToggling ? 0.5 : 1,
                                                                background: isRunning ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                                                                color: isRunning ? '#ef4444' : '#fff', border: isRunning ? '1px solid rgba(239,68,68,0.25)' : 'none',
                                                                boxShadow: isRunning ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                                                            }}>
                                                            {isToggling ? <RotateCcw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                                : isRunning ? <Square size={14} style={{ fill: '#ef4444' }} />
                                                                    : <Play size={14} style={{ fill: '#fff' }} />}
                                                            {isToggling ? '…' : isRunning ? 'Stop' : 'Run'}
                                                        </button>
                                                        <button onClick={() => navigate(`/builder/${wf.id}`)} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', cursor: 'pointer' }} title="Edit">
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(wf); }} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, color: '#ef4444', cursor: 'pointer' }} title="Delete">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 20 }}>
                                    <div style={{ width: 70, height: 70, background: 'rgba(255,255,255,0.04)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <LayoutGrid size={36} style={{ opacity: 0.3 }} />
                                    </div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>No personal workflows yet</h3>
                                    <p style={{ color: '#64748b', maxWidth: 360, textAlign: 'center', lineHeight: 1.6, fontSize: 14 }}>Build your own AI automation — describe it in plain English or drag & drop nodes in the builder.</p>
                                    <button onClick={() => navigate('/builder')} style={{ ...styles.primaryBtn, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', marginTop: 20 }}>
                                        <Plus size={16} />Create First Workflow
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, marginTop: 20 }}>
                                <div style={{ width: 36, height: 36, background: 'rgba(139,92,246,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Sparkles size={18} color="#a78bfa" />
                                </div>
                                <div>
                                    <p style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 4 }}>✨ Try AI Generation</p>
                                    <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>In the workflow builder, describe your automation in plain English and let AI build the entire workflow for you instantly.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── API Key Tab ── */}
                    {tab === 'apikey' && (
                        <div style={{ maxWidth: 560 }}>
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.headerIcon, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                            <Shield size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <p style={S.cardTitle}>Your Personal API Key</p>
                                            <p style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>Links your personal workflows to your account only</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: 24 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '4px 4px 4px 16px', marginBottom: 16, gap: 8 }}>
                                        <p style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#34d399', wordBreak: 'break-all', lineHeight: 1.5 }}>
                                            {apiKey ? (showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))) : 'No key generated yet'}
                                        </p>
                                        {apiKey && (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => setShowKey(!showKey)} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#64748b', cursor: 'pointer' }}>
                                                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                                <button onClick={() => { navigator.clipboard.writeText(apiKey); alert('API Key copied!'); }} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#64748b', cursor: 'pointer' }}>
                                                    <Copy size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={generateApiKey} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        {apiKey ? '🔄 Regenerate API Key' : '⚡ Generate My API Key'}
                                    </button>

                                    <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, marginBottom: 16 }}>
                                        <p style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>How your personal automation works:</p>
                                        <ol style={{ paddingLeft: 18, color: '#94a3b8', lineHeight: 1.9, fontSize: 13 }}>
                                            <li>Generate your personal API Key above</li>
                                            <li>Go to <button onClick={() => setTab('automation')} style={{ color: '#34d399', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Automation Builder</button> → Create Workflow</li>
                                            <li>Click the Trigger node → paste your API Key → Link & Confirm</li>
                                            <li>Build your workflow → Save → your data stays 100% private</li>
                                        </ol>
                                    </div>

                                    <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, fontSize: 13, color: '#64748b' }}>
                                        <span style={{ color: '#10b981', fontWeight: 700 }}>🔒 Privacy: </span>
                                        Your workflows and API key are completely separate from your teacher's and other students' data.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Delete Modal ── */}
            {deleteTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                            <div style={{ padding: 12, background: 'rgba(239,68,68,0.12)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
                                <Trash2 size={22} color="#ef4444" />
                            </div>
                            <div>
                                <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18 }}>Delete Workflow?</h3>
                                <p style={{ color: '#64748b', fontSize: 13 }}>This action cannot be undone.</p>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{deleteTarget.name || 'Untitled Workflow'}</p>
                            <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{deleteTarget.nodes?.length || 0} nodes · {deleteTarget.status}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={deleteWorkflow} disabled={deleting} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Design Tokens & Global Styles ── */
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, html, #root { width: 100%; height: 100%; margin: 0; padding: 0; background: #080c14; }
  body { font-family: 'Inter', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  .wf-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important; }
  .table-row-hover:hover { background: rgba(255,255,255,0.03) !important; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  button { cursor: pointer; font-family: 'Inter', sans-serif; }
`;

const styles = {
    root: { display: 'flex', minHeight: '100vh', width: '100%', background: '#080c14', color: '#f1f5f9', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' },

    sidebar: {
        width: 256, background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
        backdropFilter: 'blur(20px)',
    },
    sidebarLogo: { padding: '28px 20px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' },
    logoIcon: {
        width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
    },
    logoText: { fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: '#f1f5f9' },
    sidebarSection: { flex: 0, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    sidebarLabel: { fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 8, textTransform: 'uppercase' },
    navItem: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none',
        background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left',
        transition: 'all 0.15s', cursor: 'pointer',
    },
    navItemActive: { background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' },
    navIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', flexShrink: 0 },
    navIconActive: { background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 3px 10px rgba(16,185,129,0.4)', color: '#fff' },
    navLabel: { flex: 1 },

    sidebarStats: { flex: 1, padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8 },
    sidebarStatItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },

    sidebarFooter: { padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' },
    studentCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' },
    studentAvatar: { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 },
    studentName: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' },
    studentRole: { fontSize: 11, color: '#475569', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    logoutBtn: { background: 'rgba(239,68,68,0.1)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(239,68,68,0.2)' },

    main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' },
    header: {
        padding: '28px 36px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10,
    },
    pageTitle: { fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' },
    pageSubtitle: { fontSize: 13, color: '#475569', marginTop: 3 },
    primaryBtn: {
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none',
        borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s',
    },
    content: { padding: '28px 36px', flex: 1, animation: 'fadeIn 0.3s ease' },

    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' },
    cardHeader: {
        padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
    },
    cardTitle: { fontWeight: 800, fontSize: 15, color: '#f1f5f9' },
    headerIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
