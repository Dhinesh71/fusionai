import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserCircle, LogOut, Plus, Key, Users, RefreshCcw,
    CheckCircle, BrainCircuit, GraduationCap, Copy, Eye, EyeOff, Zap,
    Play, Square, RotateCcw, Edit3, Trash2, LayoutGrid, Wand2, AlertCircle,
    Clock, BookOpen, Activity, ChevronRight, Sparkles, Shield, Megaphone, Send, Tag, X,
    Mail, Lock, User, MessageSquare, Paperclip, UploadCloud, FileText, FileSpreadsheet,
    AlertTriangle, CheckCircle2, Phone, Home, Building2, Hash, BookMarked, Layers, Download, ClipboardList
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function StatusPill({ status }) {
    if (status === 'running') return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
            color: '#22c55e', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
            <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Live
        </span>
    );
    if (status === 'draft') return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)',
            color: '#94a3b8', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
            <span style={{ width: 6, height: 6, background: '#94a3b8', borderRadius: '50%' }} />
            Draft
        </span>
    );
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)',
            color: '#64748b', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
            <span style={{ width: 6, height: 6, background: '#64748b', borderRadius: '50%' }} />
            Stopped
        </span>
    );
}

const NAV_ITEMS = [
    { id: 'submissions', label: 'Submissions Feed', icon: Activity },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'automation', label: 'Automation Builder', icon: Zap },
    { id: 'students', label: 'Enroll Student', icon: Users },
    { id: 'student-details', label: 'Class Directory', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: ClipboardList },
    { id: 'attendance-stats', label: 'Attendance Stats', icon: Activity },
    { id: 'apikey', label: 'API Key', icon: Key },
];

const CATEGORIES = ['General', 'Syllabus', 'Assignment', 'Exam', 'Other'];

const CATEGORY_COLORS = {
    General: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
    Syllabus: { bg: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
    Assignment: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
    Exam: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    Other: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
};

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const raw = sessionStorage.getItem('teacher_session');
    const session = raw ? JSON.parse(raw) : null;
    const teacher = session?.username;
    const teacherId = session?.id;

    const [tab, setTab] = useState('submissions');
    const [submissions, setSubmissions] = useState([]);
    const [students, setStudents] = useState([]);
    const [apiKey, setApiKey] = useState(session?.apiKey || '');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newStudent, setNewStudent] = useState({
        username: '', password: '', email: '',
        registerNumber: '', fullName: '', department: '',
        year: '', semester: '', phone: '', parentPhone: '', accommodation: 'Day Scholar'
    });
    const [studentMsg, setStudentMsg] = useState('');
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [editTarget, setEditTarget] = useState(null);       // student object being edited
    const [editForm, setEditForm] = useState({});
    const [editSaving, setEditSaving] = useState(false);
    const [deleteStudentTarget, setDeleteStudentTarget] = useState(null); // single delete
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [studentActionLoading, setStudentActionLoading] = useState(false);
    const [workflows, setWorkflows] = useState([]);
    const [wfLoading, setWfLoading] = useState(false);
    const [toggling, setToggling] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Announcements state ──
    const [announcements, setAnnouncements] = useState([]);
    const [annLoading, setAnnLoading] = useState(false);
    const [annForm, setAnnForm] = useState({ title: '', body: '', category: 'General' });
    const [annFile, setAnnFile] = useState(null);
    const [annPosting, setAnnPosting] = useState(false);
    const [annMsg, setAnnMsg] = useState('');
    const [annDeleteId, setAnnDeleteId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── AI Automation State ──
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiFile, setAiFile] = useState(null);
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiError, setAiError] = useState('');

    // ── Attendance State ──
    const todayStr = new Date().toISOString().slice(0, 10);
    const [attDate, setAttDate] = useState(todayStr);
    const [attSessionId, setAttSessionId] = useState(null);
    const [attMap, setAttMap] = useState({});   // { studentId: 'present'|'absent' }
    const [attSaving, setAttSaving] = useState(false);
    const [attSummary, setAttSummary] = useState({ totalSessions: 0, summary: [] });
    const [exportFrom, setExportFrom] = useState(todayStr);
    const [exportTo, setExportTo] = useState(todayStr);
    const [attExporting, setAttExporting] = useState(false);

    useEffect(() => {
        if (!session) { navigate('/login'); return; }
        fetchAll();
    }, []);

    useEffect(() => {
        if (tab === 'automation') fetchWorkflows();
        if (tab === 'announcements') fetchAnnouncements();
        if (tab === 'attendance') { fetchAttendance(attDate); }
        if (tab === 'attendance-stats') { fetchAttSummary(); }
    }, [tab]);

    useEffect(() => {
        if (tab === 'attendance') fetchAttendance(attDate);
    }, [attDate]);

    const fetchAll = async () => {
        setLoading(true);
        const [subRes, studRes] = await Promise.all([
            fetch(`${API}/api/submissions?teacherId=${teacherId}`),
            fetch(`${API}/api/teacher/${teacher}/students`),
        ]);
        setSubmissions(await subRes.json());
        setStudents(await studRes.json());
        setLoading(false);
    };

    const fetchWorkflows = async () => {
        setWfLoading(true);
        try {
            const res = await fetch(`${API}/api/workflows?teacherId=${teacherId}`);
            const data = await res.json();
            setWorkflows(Array.isArray(data) ? data : []);
        } catch { setWorkflows([]); }
        finally { setWfLoading(false); }
    };

    const fetchAttendance = async (date) => {
        try {
            const res = await fetch(`${API}/api/teacher/attendance?teacherId=${teacherId}&date=${date}`);
            const data = await res.json();
            const map = {};
            (data.records || []).forEach(r => { map[r.student_id] = r.status; });
            setAttMap(map);
            setAttSessionId(data.sessionId);
        } catch { setAttMap({}); setAttSessionId(null); }
    };

    const fetchAttSummary = async () => {
        try {
            const res = await fetch(`${API}/api/teacher/attendance/summary?teacherId=${teacherId}`);
            const data = await res.json();
            setAttSummary(data);
        } catch { setAttSummary({ totalSessions: 0, summary: [] }); }
    };

    const ensureSession = async () => {
        if (attSessionId) return attSessionId;
        const res = await fetch(`${API}/api/teacher/attendance/session`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId, date: attDate }),
        });
        const data = await res.json();
        setAttSessionId(data.id);
        return data.id;
    };

    const markStudent = async (studentId, status) => {
        setAttMap(prev => ({ ...prev, [studentId]: status }));
        setAttSaving(true);
        try {
            const sid = await ensureSession();
            await fetch(`${API}/api/teacher/attendance/record`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid, studentId, status, teacherId }),
            });
            fetchAttSummary();
        } catch { } finally { setAttSaving(false); }
    };

    const markAll = async (status) => {
        const newMap = {};
        students.forEach(s => { newMap[s.id] = status; });
        setAttMap(newMap);
        setAttSaving(true);
        try {
            const sid = await ensureSession();
            await fetch(`${API}/api/teacher/attendance/bulk`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid, studentIds: students.map(s => s.id), status, teacherId }),
            });
            fetchAttSummary();
        } catch { } finally { setAttSaving(false); }
    };

    const exportAttendance = async () => {
        if (!exportFrom || !exportTo) return;
        setAttExporting(true);
        try {
            const url = `${API}/api/teacher/attendance/export?teacherId=${teacherId}&from=${exportFrom}&to=${exportTo}`;
            const res = await fetch(url);
            if (!res.ok) { const d = await res.json(); alert(d.error || 'Export failed'); return; }
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `attendance_${exportFrom}_to_${exportTo}.csv`;
            link.click();
        } catch { alert('Export failed'); }
        finally { setAttExporting(false); }
    };

    const generateKey = async () => {
        const res = await fetch(`${API}/api/teacher/generate-key`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherUsername: teacher }),
        });
        const data = await res.json();
        setApiKey(data.key); setShowKey(true);
        sessionStorage.setItem('teacher_session', JSON.stringify({ ...session, apiKey: data.key }));
    };

    const createStudent = async (e) => {
        e.preventDefault(); setStudentMsg('');
        const res = await fetch(`${API}/api/teacher/create-student`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherUsername: teacher,
                studentUsername: newStudent.username,
                studentPassword: newStudent.password,
                studentEmail: newStudent.email,
                registerNumber: newStudent.registerNumber,
                fullName: newStudent.fullName,
                department: newStudent.department,
                year: newStudent.year,
                semester: newStudent.semester,
                phone: newStudent.phone,
                parentPhone: newStudent.parentPhone,
                accommodation: newStudent.accommodation,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setStudentMsg(`✅ Student "${newStudent.username}" created!`);
            setNewStudent({ username: '', password: '', email: '', registerNumber: '', fullName: '', department: '', year: '', semester: '', phone: '', parentPhone: '', accommodation: 'Day Scholar' });
            fetchAll();
        } else setStudentMsg(`❌ ${data.error}`);
    };

    // ── student selection helpers ──
    const toggleSelect = (id) => setSelectedStudents(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const allSelected = students.length > 0 && selectedStudents.size === students.length;
    const toggleSelectAll = () => {
        if (allSelected) setSelectedStudents(new Set());
        else setSelectedStudents(new Set(students.map(s => s.id)));
    };

    // ── open edit modal ──
    const openEdit = (s) => {
        setEditTarget(s);
        setEditForm({
            fullName: s.full_name || '',
            email: s.email || '',
            registerNumber: s.register_number || '',
            department: s.department || '',
            year: s.year ? String(s.year) : '',
            semester: s.semester ? String(s.semester) : '',
            phone: s.phone || '',
            parentPhone: s.parent_phone || '',
            accommodation: s.accommodation || 'Day Scholar',
        });
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        setEditSaving(true);
        try {
            const res = await fetch(`${API}/api/teacher/update-student/${editTarget.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (res.ok) {
                setStudents(prev => prev.map(s => s.id === editTarget.id ? data.student : s));
                setEditTarget(null);
            } else alert(`❌ ${data.error}`);
        } catch { alert('Could not connect to server.'); }
        finally { setEditSaving(false); }
    };

    // ── delete single student ──
    const confirmDeleteStudent = async () => {
        if (!deleteStudentTarget) return;
        setStudentActionLoading(true);
        try {
            await fetch(`${API}/api/teacher/delete-student/${deleteStudentTarget.id}`, { method: 'DELETE' });
            setStudents(prev => prev.filter(s => s.id !== deleteStudentTarget.id));
            setSelectedStudents(prev => { const n = new Set(prev); n.delete(deleteStudentTarget.id); return n; });
            setDeleteStudentTarget(null);
        } catch { alert('Failed to delete student.'); }
        finally { setStudentActionLoading(false); }
    };

    // ── bulk delete selected ──
    const confirmBulkDelete = async () => {
        setStudentActionLoading(true);
        try {
            await Promise.all([...selectedStudents].map(id =>
                fetch(`${API}/api/teacher/delete-student/${id}`, { method: 'DELETE' })
            ));
            setStudents(prev => prev.filter(s => !selectedStudents.has(s.id)));
            setSelectedStudents(new Set());
            setBulkDeleteConfirm(false);
        } catch { alert('Failed to delete some students.'); }
        finally { setStudentActionLoading(false); }
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

    const fetchAnnouncements = async () => {
        setAnnLoading(true);
        try {
            const res = await fetch(`${API}/api/announcements/teacher/${teacherId}`);
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch { setAnnouncements([]); }
        finally { setAnnLoading(false); }
    };

    const postAnnouncement = async (e) => {
        e.preventDefault();
        if (!annForm.title.trim() || !annForm.body.trim()) return;
        setAnnPosting(true); setAnnMsg('');
        try {
            const formData = new FormData();
            formData.append('teacherId', teacherId);
            formData.append('title', annForm.title);
            formData.append('body', annForm.body);
            formData.append('category', annForm.category);
            if (annFile) formData.append('attachment', annFile);

            const res = await fetch(`${API}/api/announcements`, {
                method: 'POST',
                body: formData, // No Content-Type header needed for FormData
            });
            const data = await res.json();
            if (res.ok) {
                setAnnouncements(prev => [data.announcement, ...prev]);
                setAnnForm({ title: '', body: '', category: 'General' });
                setAnnFile(null);
                setAnnMsg('✅ Announcement sent with attachment!');
                setTimeout(() => setAnnMsg(''), 3500);
            } else {
                setAnnMsg(`❌ ${data.error}`);
            }
        } catch { setAnnMsg('❌ Could not reach server.'); }
        finally { setAnnPosting(false); }
    };

    const confirmDeleteAnn = async (id) => {
        try {
            await fetch(`${API}/api/announcements/${id}`, { method: 'DELETE' });
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            setAnnDeleteId(null);
        } catch { alert('Failed to delete announcement.'); }
    };

    const handleBulkImport = async (type, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        if (type === 'students') formData.append('teacherUsername', teacher);
        else formData.append('teacherId', teacherId);

        const endpoint = type === 'students' ? '/api/teacher/bulk-students' : '/api/teacher/bulk-announcements';

        try {
            const res = await fetch(`${API}${endpoint}`, { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ Success: ${data.created} created, ${data.skipped} skipped.`);
                if (type === 'students') fetchAll();
                else fetchAnnouncements();
            } else alert(`❌ Error: ${data.error}`);
        } catch { alert('❌ Could not connect to server.'); }
    };

    const handleAISmartImport = async () => {
        if (!aiFile || !aiInstruction) return;
        setAiProcessing(true); setAiError(''); setAiResult(null);

        const fd = new FormData();
        fd.append('file', aiFile);
        fd.append('instruction', aiInstruction);
        fd.append('teacherId', teacherId);
        fd.append('teacherUsername', teacher);

        try {
            const res = await fetch(`${API}/api/ai/automate`, { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
                setAiResult(data);
                if (data.type === 'STUDENTS') fetchAll();
                else fetchAnnouncements();
            } else setAiError(data.error);
        } catch { setAiError('Failed to connect to AI engine.'); }
        finally { setAiProcessing(false); }
    };

    const stats = {
        total: submissions.length,
        completed: submissions.filter(s => s.status === 'Completed').length,
        average: submissions.filter(s => s.score).length
            ? (submissions.reduce((a, s) => a + (parseInt(s.score) || 0), 0) / submissions.filter(s => s.score).length).toFixed(1)
            : '—',
    };

    const exportStudentsCSV = () => {
        if (!students.length) return;
        const headers = ['Register Number', 'Full Name', 'Username', 'Email', 'Department', 'Year', 'Semester', 'Phone', 'Parent Phone', 'Accommodation'];
        const rows = students.map(s => [
            s.register_number || '',
            s.full_name || '',
            s.username || '',
            s.email || '',
            s.department || '',
            s.year || '',
            s.semester || '',
            s.phone || '',
            s.parent_phone || '',
            s.accommodation || '',
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const runningCount = workflows.filter(w => w.status === 'running').length;
    const logout = () => { sessionStorage.removeItem('teacher_session'); navigate('/login'); };

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
                    <p style={S.sidebarLabel}>CONSOLE</p>
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const active = tab === item.id;
                        return (
                            <button key={item.id} onClick={() => setTab(item.id)} style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}>
                                <div style={{ ...S.navIcon, ...(active ? S.navIconActive : {}) }}><Icon size={16} /></div>
                                <span style={S.navLabel}>{item.label}</span>
                                {active && <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#818cf8' }} />}
                            </button>
                        );
                    })}
                </div>


                <div style={S.sidebarFooter}>
                    <div style={S.teacherCard}>
                        <div style={S.teacherAvatar}>{teacher?.[0]?.toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={S.teacherName}>{teacher}</p>
                            <p style={S.teacherRole}>Teacher</p>
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
                        <p style={S.pageSubtitle}>Teacher Console · FusionFlow AI Platform</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={fetchAll} style={S.refreshBtn} title="Refresh">
                            <RefreshCcw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                        {(tab === 'students' || tab === 'student-details' || tab === 'announcements') && (
                            <button onClick={() => { setShowAIModal(true); setAiResult(null); setAiError(''); setAiFile(null); setAiInstruction(''); }}
                                style={{ ...S.primaryBtn, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 18px rgba(124,58,237,0.45)' }}>
                                <Wand2 size={16} />AI Smart Import
                            </button>
                        )}
                        {tab === 'automation' && (
                            <button onClick={() => navigate('/builder')} style={S.primaryBtn}>
                                <Plus size={16} />Create Workflow
                            </button>
                        )}
                    </div>
                </header>

                {/* Stat Cards */}
                {tab === 'submissions' && (
                    <div style={S.statsRow}>
                        {[
                            { label: 'Total Submissions', value: stats.total, icon: BookOpen, grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', glow: 'rgba(99,102,241,0.3)' },
                            { label: 'AI Graded', value: stats.completed, icon: CheckCircle, grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.3)' },
                            { label: 'Class Average', value: stats.average, icon: BrainCircuit, grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', glow: 'rgba(245,158,11,0.3)' },
                            { label: 'Students', value: students.length, icon: Users, grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', glow: 'rgba(6,182,212,0.3)' },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} style={S.statCard}>
                                    <div style={{ ...S.statIcon, background: card.grad, boxShadow: `0 8px 24px ${card.glow}` }}>
                                        <Icon size={20} color="#fff" />
                                    </div>
                                    <div>
                                        <p style={S.statLabel}>{card.label}</p>
                                        <p style={S.statValue}>{card.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={S.content}>

                    {/* ── Submissions Tab ── */}
                    {tab === 'submissions' && (
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={S.liveIndicator} />
                                    <span style={S.cardTitle}>Live AI Assignment Feed</span>
                                </div>
                                <span style={S.badge}>{submissions.length} total</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            {['Student', 'Assignment Preview', 'Submitted', 'Status', 'AI Score'].map(h => (
                                                <th key={h} style={S.th}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={S.emptyCell}>
                                                    <div style={S.emptyState}>
                                                        <GraduationCap size={40} style={{ opacity: 0.2 }} />
                                                        <p>No submissions yet. Waiting for students...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : submissions.map((s, i) => (
                                            <tr key={s.id} style={S.tr} className="table-row-hover">
                                                <td style={S.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ ...S.miniAvatar, background: `hsl(${(s.studentUsername?.charCodeAt(0) || 65) * 7 % 360},60%,50%)` }}>
                                                            {s.studentUsername?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p style={S.tdPrimary}>{s.studentUsername}</p>
                                                            <p style={S.tdSecondary}>{s.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ ...S.td, maxWidth: 260 }}>
                                                    <p style={{ ...S.tdSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {s.assignment_text || s.assignmentText || '—'}
                                                    </p>
                                                </td>
                                                <td style={S.td}>
                                                    <p style={S.tdSecondary}>{new Date(s.submitted_at || s.submittedAt).toLocaleDateString()}</p>
                                                    <p style={{ ...S.tdSecondary, fontSize: 10 }}>{new Date(s.submitted_at || s.submittedAt).toLocaleTimeString()}</p>
                                                </td>
                                                <td style={S.td}>
                                                    <span style={{
                                                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                                                        background: s.status === 'Completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                                        color: s.status === 'Completed' ? '#10b981' : '#f59e0b',
                                                        border: `1px solid ${s.status === 'Completed' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                                    }}>{s.status}</span>
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'center' }}>
                                                    {s.score
                                                        ? <span style={{ fontSize: 22, fontWeight: 900, color: '#818cf8' }}>{s.score}<span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>/100</span></span>
                                                        : <span style={{ color: '#334155', fontSize: 18 }}>—</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Automation Tab ── */}
                    {tab === 'automation' && (
                        <div>
                            {runningCount > 0 && (
                                <div style={S.alertSuccess}>
                                    <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>{runningCount} workflow{runningCount !== 1 ? 's' : ''} running live — submissions are being graded automatically</span>
                                </div>
                            )}

                            {wfLoading ? (
                                <div style={S.loadingState}>
                                    <RotateCcw size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
                                    <p style={{ color: '#64748b', marginTop: 12 }}>Loading workflows...</p>
                                </div>
                            ) : workflows.length > 0 ? (
                                <>
                                    <div style={S.wfGrid}>
                                        {workflows.map(wf => {
                                            const isRunning = wf.status === 'running';
                                            const isToggling = !!toggling[wf.id];
                                            return (
                                                <div key={wf.id} style={{
                                                    ...S.wfCard,
                                                    border: isRunning ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                                }} className="wf-card">
                                                    {isRunning && <div style={S.runningBar} />}
                                                    <div style={S.wfCardInner}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                                                            <div style={{ ...S.wfIconWrap, background: isRunning ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)' }}>
                                                                <Zap size={22} color={isRunning ? '#22c55e' : '#818cf8'} />
                                                            </div>
                                                            <StatusPill status={wf.status} />
                                                        </div>
                                                        <h3 style={S.wfName}>{wf.name || 'Untitled Workflow'}</h3>
                                                        <p style={S.wfMeta}>{wf.nodes?.length || 0} nodes · {isRunning ? 'Grading automatically' : 'Idle'}</p>
                                                        {isRunning && wf.started_at && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: '#22c55e', fontSize: 12 }}>
                                                                <Clock size={12} />Running since {new Date(wf.started_at).toLocaleTimeString()}
                                                            </div>
                                                        )}
                                                        <div style={S.wfActions}>
                                                            <button
                                                                onClick={(e) => toggleWorkflow(wf, e)}
                                                                disabled={isToggling}
                                                                style={{
                                                                    ...S.wfToggleBtn,
                                                                    background: isRunning ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                                                                    color: isRunning ? '#ef4444' : '#fff',
                                                                    border: isRunning ? '1px solid rgba(239,68,68,0.25)' : 'none',
                                                                    boxShadow: isRunning ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                                                                    opacity: isToggling ? 0.5 : 1,
                                                                }}
                                                            >
                                                                {isToggling ? <RotateCcw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                                    : isRunning ? <Square size={14} style={{ fill: '#ef4444' }} />
                                                                        : <Play size={14} style={{ fill: '#fff' }} />}
                                                                {isToggling ? '…' : isRunning ? 'Stop' : 'Run Workflow'}
                                                            </button>
                                                            <button onClick={() => navigate(`/builder/${wf.id}`)} style={S.wfIconBtn} title="Edit">
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(wf); }} style={{ ...S.wfIconBtn, color: '#ef4444' }} title="Delete">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {workflows.some(w => w.status !== 'running') && (
                                        <div style={S.alertWarning}>
                                            <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 2 }}>Some workflows are stopped</p>
                                                <p style={{ color: '#92400e', fontSize: 13 }}>Student submissions will show "No active workflow" until you press <strong>Run Workflow</strong>.</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={S.emptyWorkflows}>
                                    <div style={S.emptyIcon}><LayoutGrid size={36} style={{ opacity: 0.4 }} /></div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>No workflows yet</h3>
                                    <p style={{ color: '#64748b', maxWidth: 380, textAlign: 'center', lineHeight: 1.6, fontSize: 14 }}>
                                        Create a workflow, link it to your Teacher account via the Trigger node → API Key, then hit <strong style={{ color: '#818cf8' }}>Run</strong> to activate.
                                    </p>
                                    <button onClick={() => navigate('/builder')} style={{ ...S.primaryBtn, marginTop: 24 }}>
                                        <Plus size={16} />Create First Workflow
                                    </button>
                                </div>
                            )}

                            <div style={S.aiTip}>
                                <div style={S.aiTipIcon}><Sparkles size={18} color="#a78bfa" /></div>
                                <div>
                                    <p style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 4 }}>✨ AI Workflow Generation</p>
                                    <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                                        In the builder, describe your grading workflow in plain English — AI will generate the entire node graph for you automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Enroll Student Tab ── */}
                    {tab === 'students' && (
                        <div>

                            {/* Hero Banner */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 50%, rgba(6,182,212,0.1) 100%)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 20,
                                padding: '28px 32px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 20,
                                marginBottom: 24,
                            }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 28px rgba(99,102,241,0.45)' }}>
                                    <Users size={26} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 20, margin: 0 }}>Enroll a New Student</h2>
                                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Fill in the student’s credentials and profile. They’ll be able to log in and submit assignments immediately.</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={{ color: '#818cf8', fontWeight: 900, fontSize: 28, margin: 0 }}>{students.length}</p>
                                    <p style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>enrolled</p>
                                </div>
                            </div>

                            <div style={S.card}>
                                <div style={{ padding: '28px 32px' }}>
                                    <form onSubmit={createStudent}>

                                        {/* Row 1: Account Credentials */}
                                        <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Account Credentials</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                                            <div>
                                                <label style={S.inputLabel}>Username <span style={{ color: '#f87171' }}>*</span></label>
                                                <div style={S.inputWrapper}><User size={15} color="#6366f1" style={S.inputIcon} />
                                                    <input required placeholder="e.g. john_doe" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.username} onChange={e => setNewStudent({ ...newStudent, username: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Password <span style={{ color: '#f87171' }}>*</span></label>
                                                <div style={S.inputWrapper}><Lock size={15} color="#6366f1" style={S.inputIcon} />
                                                    <input required type="password" placeholder="Set a secure password" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Email Address <span style={{ color: '#f87171' }}>*</span></label>
                                                <div style={S.inputWrapper}><Mail size={15} color="#6366f1" style={S.inputIcon} />
                                                    <input required placeholder="student@example.com" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Student Profile */}
                                        <p style={{ fontSize: 10, fontWeight: 800, color: '#06b6d4', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Student Profile</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                            <div>
                                                <label style={S.inputLabel}>Register Number</label>
                                                <div style={S.inputWrapper}><Hash size={15} color="#06b6d4" style={S.inputIcon} />
                                                    <input placeholder="e.g. 21CS001" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.registerNumber} onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Full Name</label>
                                                <div style={S.inputWrapper}><User size={15} color="#06b6d4" style={S.inputIcon} />
                                                    <input placeholder="e.g. John Smith" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.fullName} onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Department</label>
                                                <div style={S.inputWrapper}><Building2 size={15} color="#06b6d4" style={S.inputIcon} />
                                                    <input placeholder="e.g. Computer Science" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.department} onChange={e => setNewStudent({ ...newStudent, department: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                            <div>
                                                <label style={S.inputLabel}>Year</label>
                                                <select style={{ ...S.input, paddingLeft: 14 }} className="ff-input" value={newStudent.year} onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}>
                                                    <option value="">Select Year</option>
                                                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Semester</label>
                                                <select style={{ ...S.input, paddingLeft: 14 }} className="ff-input" value={newStudent.semester} onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}>
                                                    <option value="">Select Semester</option>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Row 3: Contact + Accommodation */}
                                        <p style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Contact & Accommodation</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                                            <div>
                                                <label style={S.inputLabel}>Phone Number</label>
                                                <div style={S.inputWrapper}><Phone size={15} color="#f59e0b" style={S.inputIcon} />
                                                    <input type="tel" placeholder="e.g. 9876543210" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.phone} onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Parent Phone Number</label>
                                                <div style={S.inputWrapper}><Phone size={15} color="#f59e0b" style={S.inputIcon} />
                                                    <input type="tel" placeholder="e.g. 9123456780" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={newStudent.parentPhone} onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Accommodation</label>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                    {['Hosteller', 'Day Scholar'].map(opt => (
                                                        <button key={opt} type="button" onClick={() => setNewStudent({ ...newStudent, accommodation: opt })} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: newStudent.accommodation === opt ? (opt === 'Hosteller' ? 'rgba(99,102,241,0.18)' : 'rgba(16,185,129,0.15)') : 'rgba(255,255,255,0.04)', color: newStudent.accommodation === opt ? (opt === 'Hosteller' ? '#818cf8' : '#10b981') : '#475569', border: newStudent.accommodation === opt ? `1px solid ${opt === 'Hosteller' ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.3)'}` : '1px solid rgba(255,255,255,0.07)' }}>
                                                            {opt === 'Hosteller' ? '🏠' : '🚌'} {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

                                        {/* Bottom: submit + excel import side by side */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
                                            <div>
                                                {studentMsg && (
                                                    <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 10, background: studentMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: studentMsg.startsWith('✅') ? '#10b981' : '#ef4444', border: `1px solid ${studentMsg.startsWith('✅') ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>{studentMsg}</div>
                                                )}
                                                <button type="submit" style={{ ...S.primaryBtn, width: '100%', justifyContent: 'center', padding: '15px', fontSize: 15, fontWeight: 800, borderRadius: 14 }}>
                                                    <Plus size={16} /> Enroll Student
                                                </button>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or Bulk Import from Excel</p>
                                                <label htmlFor="bulk-student-input" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, border: '1.5px dashed rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.04)', cursor: 'pointer', transition: 'all 0.2s', height: 52, boxSizing: 'border-box' }} className="ff-input-hover">
                                                    <FileSpreadsheet size={22} color="#22c55e" style={{ flexShrink: 0 }} />
                                                    <div>
                                                        <p style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, margin: 0 }}>Upload .xlsx / .csv</p>
                                                        <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>Fields: username, email, password</p>
                                                    </div>
                                                </label>
                                                <input id="bulk-student-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleBulkImport('students', e.target.files[0]); e.target.value = ''; }} />
                                            </div>
                                        </div>

                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Attendance Tab ── */}
                    {tab === 'attendance' && (
                        <div>

                            {/* Attendance Register */}
                            <div style={S.card}>
                                {/* Header */}
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', width: 36, height: 36 }}>
                                            <ClipboardList size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <span style={S.cardTitle}>Attendance Register</span>
                                            <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Mark students present or absent for the selected date</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {attSaving && <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>Saving…</span>}
                                        <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                                            style={{ ...S.input, padding: '7px 12px', fontSize: 13, width: 'auto', borderRadius: 10, cursor: 'pointer' }}
                                            className="ff-input" />
                                    </div>
                                </div>

                                {/* Bulk Action Bar */}
                                {students.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Bulk:</span>
                                        <button onClick={() => markAll('present')}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                            <CheckCircle2 size={13} /> Present All
                                        </button>
                                        <button onClick={() => markAll('absent')}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                            <X size={13} /> Absent All
                                        </button>
                                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                            {Object.values(attMap).filter(v => v === 'present').length} / {students.length} present
                                        </span>
                                    </div>
                                )}

                                {/* Student List */}
                                <div style={{ padding: '0 20px 20px' }}>
                                    {students.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                                            <ClipboardList size={44} style={{ opacity: 0.15, marginBottom: 16 }} />
                                            <p style={{ fontWeight: 600 }}>No students enrolled yet</p>
                                            <p style={{ fontSize: 13, marginTop: 4 }}>Enroll students first to take attendance.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', paddingRight: 4 }}>
                                            {students.map((s, i) => {
                                                const status = attMap[s.id];
                                                const hue = (s.username?.charCodeAt(0) || 65) * 7 % 360;
                                                return (
                                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: status === 'present' ? 'rgba(16,185,129,0.06)' : status === 'absent' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${status === 'present' ? 'rgba(16,185,129,0.2)' : status === 'absent' ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>
                                                        {/* Index */}
                                                        <span style={{ fontSize: 11, color: '#334155', fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{i + 1}</span>
                                                        {/* Avatar */}
                                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${hue},60%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                                                            {(s.full_name || s.username)?.[0]?.toUpperCase()}
                                                        </div>
                                                        {/* Name */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name || s.username}</p>
                                                            <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{s.register_number || `@${s.username}`}</p>
                                                        </div>
                                                        {/* Status badge */}
                                                        {status && (
                                                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', background: status === 'present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)', color: status === 'present' ? '#10b981' : '#f87171', border: `1px solid ${status === 'present' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}` }}>
                                                                {status === 'present' ? '✓ Present' : '✗ Absent'}
                                                            </span>
                                                        )}
                                                        {/* P / A buttons */}
                                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                            <button onClick={() => markStudent(s.id, 'present')}
                                                                style={{ width: 36, height: 36, borderRadius: 9, border: 'none', background: status === 'present' ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(16,185,129,0.08)', color: status === 'present' ? '#fff' : '#10b981', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', boxShadow: status === 'present' ? '0 4px 14px rgba(16,185,129,0.35)' : 'none' }}>
                                                                P
                                                            </button>
                                                            <button onClick={() => markStudent(s.id, 'absent')}
                                                                style={{ width: 36, height: 36, borderRadius: 9, border: status === 'absent' ? 'none' : '1px solid rgba(239,68,68,0.2)', background: status === 'absent' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(239,68,68,0.06)', color: status === 'absent' ? '#fff' : '#f87171', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', boxShadow: status === 'absent' ? '0 4px 14px rgba(239,68,68,0.35)' : 'none' }}>
                                                                A
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ── Attendance Stats Tab (Percentages + Export) ── */}
                    {tab === 'attendance-stats' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 24, alignItems: 'start' }}>
                            {/* Left Panel: Detailed Student Summary */}
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)', width: 36, height: 36 }}>
                                            <Activity size={18} color="#fff" />
                                        </div>
                                        <div>
                                            <span style={S.cardTitle}>Student Attendance Recap</span>
                                            <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Overall performance of all students in your class</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 8 }}>
                                            Total: {attSummary.totalSessions} sessions
                                        </span>
                                    </div>
                                </div>

                                <div style={{ padding: '0 20px 20px' }}>
                                    {students.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                                            <Activity size={44} style={{ opacity: 0.15, marginBottom: 16 }} />
                                            <p style={{ fontWeight: 600 }}>Enroll students to see data</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 20, maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: 4 }}>
                                            {students.map(s => {
                                                const rec = attSummary.summary?.find(r => r.studentId === s.id);
                                                const pct = rec ? rec.percentage : 0;
                                                const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                                const hue = (s.username?.charCodeAt(0) || 65) * 7 % 360;
                                                return (
                                                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: `hsl(${hue},60%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>
                                                                {(s.full_name || s.username)?.[0]?.toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name || s.username}</p>
                                                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{s.register_number || `@${s.username}`}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ fontSize: 18, fontWeight: 900, color }}>{rec ? `${pct}%` : '0%'}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                                            <span>Present: {rec ? rec.present : 0}</span>
                                                            <span>Absent: {rec ? rec.absent : 0}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Export Tool + Legend */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ ...S.card, padding: 20, background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                        <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 6px 20px rgba(59,130,246,0.3)', width: 32, height: 32 }}>
                                            <Download size={15} color="#fff" />
                                        </div>
                                        <span style={{ ...S.cardTitle, fontSize: 15 }}>Attendance Report</span>
                                    </div>

                                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>Select a period to download a detailed Excel report of all students.</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div>
                                            <p style={{ color: '#475569', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>From Date</p>
                                            <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                                                style={{ ...S.input, padding: '10px', fontSize: 13, borderRadius: 10, cursor: 'pointer' }} className="ff-input" />
                                        </div>
                                        <div>
                                            <p style={{ color: '#475569', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>To Date</p>
                                            <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                                                style={{ ...S.input, padding: '10px', fontSize: 13, borderRadius: 10, cursor: 'pointer' }} className="ff-input" />
                                        </div>

                                        <button onClick={exportAttendance} disabled={attExporting}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: attExporting ? 'not-allowed' : 'pointer', opacity: attExporting ? 0.7 : 1, marginTop: 10, boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                                            {attExporting ? <RotateCcw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                                            {attExporting ? 'Generating Report...' : 'Download Full Excel'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ ...S.card, padding: 18 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Status Legend</p>
                                    {[['#10b981', '≥ 75%', 'Excellent Standing'], ['#f59e0b', '50–74%', 'Needs Attention'], ['#ef4444', '< 50%', 'Critical Warning']].map(([c, range, label]) => (
                                        <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 10px ${c}33` }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: c, margin: 0 }}>{range}</p>
                                                <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Student Details Tab ── */}
                    {tab === 'student-details' && (
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', boxShadow: '0 8px 24px rgba(6,182,212,0.3)', width: 36, height: 36 }}>
                                        <Users size={16} color="#fff" />
                                    </div>
                                    <div>
                                        <span style={S.cardTitle}>Student Details</span>
                                        <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Full profile of all enrolled students</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {students.length > 0 && (
                                        <>
                                            <button
                                                onClick={exportStudentsCSV}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                                                title="Export all students as Excel/CSV"
                                            >
                                                <Download size={13} /> Export Excel
                                            </button>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600, userSelect: 'none' }}>
                                                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                                                Select All
                                            </label>
                                        </>
                                    )}
                                    <span style={S.badge}>{students.length}</span>
                                </div>
                            </div>
                            {selectedStudents.size > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
                                    <span style={{ color: '#f87171', fontWeight: 700, fontSize: 13 }}>{selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => setSelectedStudents(new Set())} style={{ padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Deselect</button>
                                        <button onClick={() => setBulkDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                            <Trash2 size={13} /> Delete Selected
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div style={{ padding: '20px' }}>
                                {students.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                                        <GraduationCap size={44} style={{ opacity: 0.15, marginBottom: 16 }} />
                                        <p style={{ fontSize: 15, fontWeight: 600 }}>No students yet</p>
                                        <p style={{ fontSize: 13, marginTop: 4 }}>Go to <strong style={{ color: '#818cf8' }}>Manage Students</strong> to add your first student.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: 4 }}>
                                        {students.map(s => {
                                            const hue = (s.username?.charCodeAt(0) || 65) * 7 % 360;
                                            const isSel = selectedStudents.has(s.id);
                                            return (
                                                <div key={s.id || s.username} style={{ background: isSel ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', border: isSel ? '1.5px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', transition: 'all 0.18s', position: 'relative' }} className="wf-card">
                                                    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
                                                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(s.id)} style={{ width: 17, height: 17, accentColor: '#6366f1', cursor: 'pointer' }} />
                                                    </div>
                                                    <div style={{ background: `linear-gradient(135deg, hsl(${hue},55%,25%), hsl(${hue + 40},55%,18%))`, padding: '14px 14px 14px 40px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 42, height: 42, borderRadius: 11, background: `hsl(${hue},60%,50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: `0 4px 14px hsl(${hue},60%,30%)` }}>
                                                            {(s.full_name || s.username)?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.full_name || s.username}</p>
                                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>@{s.username}</p>
                                                        </div>
                                                        {s.accommodation && (
                                                            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.accommodation === 'Hosteller' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.25)', color: s.accommodation === 'Hosteller' ? '#a5b4fc' : '#6ee7b7', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                                                                {s.accommodation === 'Hosteller' ? '🏠' : '🚌'} {s.accommodation}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {s.register_number && <div style={studentInfoChip('#6366f1')}><Hash size={10} /> {s.register_number}</div>}
                                                            {s.department && <div style={studentInfoChip('#06b6d4')}><Building2 size={10} /> {s.department}</div>}
                                                        </div>
                                                        {(s.year || s.semester) && (
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                {s.year && <div style={studentInfoChip('#f59e0b')}><BookMarked size={10} /> Year {s.year}</div>}
                                                                {s.semester && <div style={studentInfoChip('#f59e0b')}><Layers size={10} /> Sem {s.semester}</div>}
                                                            </div>
                                                        )}
                                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}><Mail size={12} style={{ color: '#475569', flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span></div>
                                                        {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}><Phone size={12} style={{ color: '#475569', flexShrink: 0 }} /><span>{s.phone}</span></div>}
                                                        {s.parent_phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}><Phone size={12} style={{ color: '#f59e0b', flexShrink: 0 }} /><span style={{ color: '#64748b', fontSize: 11 }}>Parent:</span><span>{s.parent_phone}</span></div>}
                                                        <div style={{ display: 'flex', gap: 7, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 2 }}>
                                                            <button onClick={() => openEdit(s)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 9, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                            <button onClick={() => setDeleteStudentTarget(s)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}



                    {/* ── API Key Tab ── */}
                    {tab === 'apikey' && (
                        <div style={{ maxWidth: 560 }}>
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', width: 36, height: 36 }}>
                                            <Shield size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <span style={S.cardTitle}>Dashboard API Key</span>
                                            <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Link automation workflows to this dashboard</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: 24 }}>
                                    <div style={S.apiKeyBox}>
                                        <p style={S.apiKeyDisplay}>
                                            {apiKey ? (showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))) : 'No key generated yet'}
                                        </p>
                                        {apiKey && (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => setShowKey(!showKey)} style={S.iconBtn}>
                                                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                                <button onClick={() => { navigator.clipboard.writeText(apiKey); alert('API Key copied!'); }} style={S.iconBtn}>
                                                    <Copy size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={generateKey} style={{ ...S.primaryBtn, width: '100%', justifyContent: 'center', padding: '14px', marginBottom: 20 }}>
                                        {apiKey ? '🔄 Regenerate API Key' : '⚡ Generate API Key'}
                                    </button>
                                    <div style={S.instructionBox}>
                                        <p style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>How to link to Automation Builder:</p>
                                        <ol style={{ paddingLeft: 18, color: '#94a3b8', lineHeight: 1.9, fontSize: 13 }}>
                                            <li>Generate an API Key above</li>
                                            <li>Go to the <button onClick={() => setTab('automation')} style={{ color: '#818cf8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Automation Builder</button> tab → Create Workflow</li>
                                            <li>Open the Trigger node → paste the API Key</li>
                                            <li>Save &amp; deploy — submissions will auto-grade!</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                    }
                    {/* ── Announcements Tab ── */}
                    {
                        tab === 'announcements' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>

                                {/* Compose Form */}
                                <div style={S.card}>
                                    <div style={S.cardHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ ...S.statIcon, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)', width: 36, height: 36 }}>
                                                <Megaphone size={16} color="#fff" />
                                            </div>
                                            <div>
                                                <span style={S.cardTitle}>New Announcement</span>
                                                <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Sent instantly to all your students</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: 24 }}>
                                        <form onSubmit={postAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                            {/* Category selector */}
                                            <div>
                                                <label style={S.inputLabel}>Category</label>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                                    {CATEGORIES.map(cat => {
                                                        const c = CATEGORY_COLORS[cat];
                                                        const active = annForm.category === cat;
                                                        return (
                                                            <button key={cat} type="button"
                                                                onClick={() => setAnnForm(f => ({ ...f, category: cat }))}
                                                                style={{
                                                                    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                                    background: active ? c.bg : 'rgba(255,255,255,0.04)',
                                                                    color: active ? c.color : '#475569',
                                                                    border: active ? `1px solid ${c.border}` : '1px solid rgba(255,255,255,0.07)',
                                                                    boxShadow: active ? `0 0 0 3px ${c.bg}` : 'none',
                                                                }}>
                                                                {cat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Title</label>
                                                <div style={S.inputWrapper}>
                                                    <Edit3 size={16} color="#475569" style={S.inputIcon} />
                                                    <input
                                                        required placeholder="e.g. Mid-term exam schedule"
                                                        style={{ ...S.input, paddingLeft: 42 }} className="ff-input"
                                                        value={annForm.title}
                                                        onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={S.inputLabel}>Message</label>
                                                <div style={S.inputWrapper}>
                                                    <MessageSquare size={16} color="#475569" style={{ ...S.inputIcon, top: 16 }} />
                                                    <textarea
                                                        required rows={6}
                                                        placeholder="Type your announcement here. You can include dates, links, topics, or any academic info..."
                                                        style={{ ...S.input, paddingLeft: 42, resize: 'vertical', lineHeight: 1.6 }}
                                                        className="ff-input"
                                                        value={annForm.body}
                                                        onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* File Attachment Upload */}
                                            <div
                                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setAnnFile(f); }}
                                                style={{
                                                    padding: '16px 18px',
                                                    border: `1px dashed ${isDragging ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: 16,
                                                    background: isDragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.01)',
                                                    position: 'relative',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    id="ann-file-input"
                                                    style={{ display: 'none' }}
                                                    onChange={e => setAnnFile(e.target.files[0])}
                                                />
                                                {!annFile ? (
                                                    <label htmlFor="ann-file-input" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '10px 0' }}>
                                                        <UploadCloud size={24} color="#475569" />
                                                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Attach Study Materials</span>
                                                        <span style={{ fontSize: 11, color: '#334155' }}>PDF, Images, Word, PPT (Max 50MB)</span>
                                                    </label>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                                                        <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {annFile.type.startsWith('image/') ? <Activity size={18} color="#818cf8" /> : <FileText size={18} color="#818cf8" />}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{annFile.name}</p>
                                                            <p style={{ fontSize: 11, color: '#64748b' }}>{(annFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                        <button type="button" onClick={() => setAnnFile(null)} style={{ border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {annMsg && (
                                                <div style={{
                                                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                                    background: annMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: annMsg.startsWith('✅') ? '#10b981' : '#ef4444',
                                                    border: `1px solid ${annMsg.startsWith('✅') ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                                }}>{annMsg}</div>
                                            )}
                                            <button type="submit" disabled={annPosting}
                                                style={{
                                                    ...S.primaryBtn, width: '100%', justifyContent: 'center', padding: '14px',
                                                    background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                                                    boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                                                    opacity: annPosting ? 0.6 : 1
                                                }}>
                                                {annPosting
                                                    ? <RotateCcw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                                    : <Send size={15} />}
                                                {annPosting ? 'Publishing…' : 'Publish Announcement'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Announcements list */}
                                <div style={S.card}>
                                    <div style={S.cardHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                                            <span style={S.cardTitle}>Published Announcements</span>
                                        </div>
                                        <span style={{ ...S.badge, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>{announcements.length} total</span>
                                    </div>
                                    <div style={{ padding: 24 }}>
                                        {annLoading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160 }}>
                                                <RotateCcw size={22} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
                                            </div>
                                        ) : announcements.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, color: '#334155' }}>
                                                <Megaphone size={36} style={{ opacity: 0.15, marginBottom: 12 }} />
                                                <p style={{ fontSize: 14 }}>No announcements yet.</p>
                                                <p style={{ fontSize: 12, color: '#1e293b', marginTop: 4 }}>Compose one on the left to notify all students.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 520, overflowY: 'auto' }}>
                                                {announcements.map(ann => {
                                                    const c = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.General;
                                                    return (
                                                        <div key={ann.id} style={{
                                                            padding: '16px 18px', borderRadius: 16,
                                                            background: 'rgba(255,255,255,0.03)',
                                                            border: `1px solid ${c.border}`,
                                                            position: 'relative', animation: 'fadeIn 0.3s ease',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                                                                        {ann.category}
                                                                    </span>
                                                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{ann.title}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setAnnDeleteId(ann.id)}
                                                                    style={{ width: 28, height: 28, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{ann.body}</p>

                                                            {ann.attachment_url && (
                                                                <div style={{ marginBottom: 14 }}>
                                                                    <a href={`${API}${ann.attachment_url}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }} className="table-row-hover">
                                                                            <div style={{ width: 28, height: 28, background: 'rgba(99,102,241,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <Paperclip size={14} color="#818cf8" />
                                                                            </div>
                                                                            <div style={{ minWidth: 0 }}>
                                                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{ann.attachment_name || 'Attached Material'}</p>
                                                                                <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 700 }}>VIEW ATTACHMENT</p>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            )}

                                                            <p style={{ fontSize: 11, color: '#334155' }}>{new Date(ann.created_at).toLocaleString()}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                </div>
            </main>

            {/* ── Delete Announcement Confirm ── */}
            {
                annDeleteId && (
                    <div style={S.modalBackdrop}>
                        <div style={{ ...S.modal, maxWidth: 340 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                <div style={{ padding: 12, background: 'rgba(239,68,68,0.12)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <Trash2 size={20} color="#ef4444" />
                                </div>
                                <div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 17 }}>Delete Announcement?</h3>
                                    <p style={{ color: '#64748b', fontSize: 13 }}>Students will no longer see this.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setAnnDeleteId(null)} style={S.cancelBtn}>Cancel</button>
                                <button onClick={() => confirmDeleteAnn(annDeleteId)} style={S.deleteBtn}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── Edit Student Modal ── */}
            {
                editTarget && (
                    <div style={S.modalBackdrop} onClick={() => !editSaving && setEditTarget(null)}>
                        <div style={{ ...S.modal, maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(99,102,241,0.4)' }}>
                                    <Edit3 size={19} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 17 }}>Edit Student</h3>
                                    <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>@{editTarget.username}</p>
                                </div>
                                {!editSaving && <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}><X size={18} /></button>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Account</p>
                                <div>
                                    <label style={S.inputLabel}>Email</label>
                                    <div style={S.inputWrapper}><Mail size={14} color="#6366f1" style={S.inputIcon} /><input style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                                </div>
                                <div>
                                    <label style={S.inputLabel}>Register Number</label>
                                    <div style={S.inputWrapper}><Hash size={14} color="#6366f1" style={S.inputIcon} /><input style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.registerNumber || ''} onChange={e => setEditForm({ ...editForm, registerNumber: e.target.value })} /></div>
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#06b6d4', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Profile</p>
                                <div>
                                    <label style={S.inputLabel}>Full Name</label>
                                    <div style={S.inputWrapper}><User size={14} color="#06b6d4" style={S.inputIcon} /><input style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.fullName || ''} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
                                </div>
                                <div>
                                    <label style={S.inputLabel}>Department</label>
                                    <div style={S.inputWrapper}><Building2 size={14} color="#06b6d4" style={S.inputIcon} /><input style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.department || ''} onChange={e => setEditForm({ ...editForm, department: e.target.value })} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={S.inputLabel}>Year</label>
                                        <select style={{ ...S.input, paddingLeft: 14 }} className="ff-input" value={editForm.year || ''} onChange={e => setEditForm({ ...editForm, year: e.target.value })}>
                                            <option value="">Select</option>
                                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={S.inputLabel}>Semester</label>
                                        <select style={{ ...S.input, paddingLeft: 14 }} className="ff-input" value={editForm.semester || ''} onChange={e => setEditForm({ ...editForm, semester: e.target.value })}>
                                            <option value="">Select</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Contact</p>
                                <div>
                                    <label style={S.inputLabel}>Phone</label>
                                    <div style={S.inputWrapper}><Phone size={14} color="#f59e0b" style={S.inputIcon} /><input type="tel" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                                </div>
                                <div>
                                    <label style={S.inputLabel}>Parent Phone</label>
                                    <div style={S.inputWrapper}><Phone size={14} color="#f59e0b" style={S.inputIcon} /><input type="tel" style={{ ...S.input, paddingLeft: 44 }} className="ff-input" value={editForm.parentPhone || ''} onChange={e => setEditForm({ ...editForm, parentPhone: e.target.value })} /></div>
                                </div>
                                <div>
                                    <label style={S.inputLabel}>Accommodation</label>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        {['Hosteller', 'Day Scholar'].map(opt => (
                                            <button key={opt} type="button" onClick={() => setEditForm({ ...editForm, accommodation: opt })}
                                                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: editForm.accommodation === opt ? `1px solid ${opt === 'Hosteller' ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.3)'}` : '1px solid rgba(255,255,255,0.07)', background: editForm.accommodation === opt ? (opt === 'Hosteller' ? 'rgba(99,102,241,0.18)' : 'rgba(16,185,129,0.15)') : 'rgba(255,255,255,0.04)', color: editForm.accommodation === opt ? (opt === 'Hosteller' ? '#818cf8' : '#10b981') : '#475569' }}>
                                                {opt === 'Hosteller' ? '🏠 Hosteller' : '🚌 Day Scholar'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <button onClick={() => setEditTarget(null)} disabled={editSaving} style={S.cancelBtn}>Cancel</button>
                                    <button onClick={saveEdit} disabled={editSaving} style={{ ...S.primaryBtn, flex: 1, justifyContent: 'center', padding: '13px', opacity: editSaving ? 0.7 : 1 }}>
                                        {editSaving ? <><RotateCcw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><CheckCircle size={14} /> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── Delete Single Student Confirm ── */}
            {
                deleteStudentTarget && (
                    <div style={S.modalBackdrop}>
                        <div style={{ ...S.modal, maxWidth: 340 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                <div style={{ padding: 12, background: 'rgba(239,68,68,0.12)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}><Trash2 size={20} color="#ef4444" /></div>
                                <div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 17 }}>Delete Student?</h3>
                                    <p style={{ color: '#64748b', fontSize: 13 }}>Permanently remove <strong style={{ color: '#f1f5f9' }}>@{deleteStudentTarget.username}</strong>?</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setDeleteStudentTarget(null)} disabled={studentActionLoading} style={S.cancelBtn}>Cancel</button>
                                <button onClick={confirmDeleteStudent} disabled={studentActionLoading} style={S.deleteBtn}>{studentActionLoading ? 'Deleting…' : 'Yes, Delete'}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── Bulk Delete Students Confirm ── */}
            {
                bulkDeleteConfirm && (
                    <div style={S.modalBackdrop}>
                        <div style={{ ...S.modal, maxWidth: 360 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                <div style={{ padding: 12, background: 'rgba(239,68,68,0.12)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}><Trash2 size={22} color="#ef4444" /></div>
                                <div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 17 }}>Delete {selectedStudents.size} Students?</h3>
                                    <p style={{ color: '#64748b', fontSize: 13 }}>This action cannot be undone.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setBulkDeleteConfirm(false)} disabled={studentActionLoading} style={S.cancelBtn}>Cancel</button>
                                <button onClick={confirmBulkDelete} disabled={studentActionLoading} style={S.deleteBtn}>{studentActionLoading ? 'Deleting…' : `Delete All ${selectedStudents.size}`}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── Delete Workflow Modal ── */}
            {
                deleteTarget && (
                    <div style={S.modalBackdrop}>
                        <div style={S.modal}>
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
                                <button onClick={() => setDeleteTarget(null)} style={S.cancelBtn}>Cancel</button>
                                <button onClick={deleteWorkflow} disabled={deleting} style={S.deleteBtn}>
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── AI Smart Import Modal ── */}
            {
                showAIModal && (
                    <div style={S.modalBackdrop} onClick={() => !aiProcessing && setShowAIModal(false)}>
                        <div style={{ ...S.modal, maxWidth: 520, padding: 32 }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                <div style={{ width: 46, height: 46, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(124,58,237,0.5)' }}>
                                    <Wand2 size={22} color="#fff" />
                                </div>
                                <div>
                                    <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 19 }}>AI Smart Import</h3>
                                    <p style={{ color: '#64748b', fontSize: 13 }}>Upload an Excel file — AI figures out what to do</p>
                                </div>
                                {!aiProcessing && <button onClick={() => setShowAIModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={18} /></button>}
                            </div>

                            {/* File Drop */}
                            <div style={{ marginBottom: 16 }}>
                                <label htmlFor="ai-import-file">
                                    <div style={{ padding: '20px', border: `1px dashed ${aiFile ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 14, background: aiFile ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                        {aiFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                                <FileSpreadsheet size={22} color="#818cf8" />
                                                <div style={{ textAlign: 'left' }}>
                                                    <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{aiFile.name}</p>
                                                    <p style={{ color: '#64748b', fontSize: 11 }}>{(aiFile.size / 1024).toFixed(1)} KB · Click to change</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud size={28} color="#475569" style={{ marginBottom: 8 }} />
                                                <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Drop your Excel or CSV file here</p>
                                                <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>.xlsx · .xls · .csv — Max 20MB</p>
                                            </>
                                        )}
                                    </div>
                                </label>
                                <input id="ai-import-file" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => setAiFile(e.target.files[0])} />
                            </div>

                            {/* Instruction */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ ...S.inputLabel, display: 'block', marginBottom: 8 }}>What should AI do with this file?</label>
                                <textarea
                                    rows={3}
                                    placeholder='e.g. "Add all students from this Excel to my class" or "Send exam schedule announcements from this file"'
                                    style={{ ...S.input, resize: 'vertical', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' }}
                                    className="ff-input"
                                    value={aiInstruction}
                                    onChange={e => setAiInstruction(e.target.value)}
                                />
                            </div>

                            {/* Presets */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                {[
                                    { label: '👨‍🎓 Add students', val: 'Add all students from this Excel to my class' },
                                    { label: '📢 Broadcast announcements', val: 'Create announcements from this Excel and send to all students' },
                                    { label: '📅 Send exam schedule', val: 'Create exam schedule announcements from this file for all students' },
                                ].map(p => (
                                    <button key={p.val} type="button" onClick={() => setAiInstruction(p.val)}
                                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* Error / Result */}
                            {aiError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 16 }}>
                                    <AlertTriangle size={16} color="#ef4444" />
                                    <p style={{ color: '#ef4444', fontSize: 13 }}>{aiError}</p>
                                </div>
                            )}
                            {aiResult && (
                                <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <CheckCircle2 size={16} color="#10b981" />
                                        <p style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>AI Task Complete!</p>
                                    </div>
                                    <p style={{ color: '#94a3b8', fontSize: 13 }}>Type: <strong style={{ color: '#f1f5f9' }}>{aiResult.type}</strong> · Created: <strong style={{ color: '#34d399' }}>{aiResult.created}</strong> · Skipped: <strong style={{ color: '#fbbf24' }}>{aiResult.skipped}</strong></p>
                                    {aiResult.errors?.length > 0 && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{aiResult.errors.slice(0, 3).join(' · ')}</p>}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                {!aiResult && <button onClick={() => setShowAIModal(false)} disabled={aiProcessing} style={S.cancelBtn}>Cancel</button>}
                                {aiResult
                                    ? <button onClick={() => setShowAIModal(false)} style={{ ...S.primaryBtn, flex: 1, justifyContent: 'center', padding: '13px' }}>Done ✓</button>
                                    : <button onClick={handleAISmartImport} disabled={!aiFile || !aiInstruction || aiProcessing}
                                        style={{ ...S.primaryBtn, flex: 1, justifyContent: 'center', padding: '13px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 18px rgba(124,58,237,0.4)', opacity: (!aiFile || !aiInstruction || aiProcessing) ? 0.5 : 1 }}>
                                        {aiProcessing ? <><RotateCcw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with AI…</> : <><Sparkles size={15} /> Run AI Import</>}
                                    </button>
                                }
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

/* ── Student info chip helper ── */
const studentInfoChip = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: `${color}18`, color, border: `1px solid ${color}30`,
    whiteSpace: 'nowrap',
});

/* ── Design Tokens & Styles ── */
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, html, #root { width: 100%; height: 100%; margin: 0; padding: 0; background: #080c14; }
  body { font-family: 'Inter', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  .table-row-hover:hover { background: rgba(255,255,255,0.03) !important; }
  .wf-card { transition: transform 0.2s, box-shadow 0.2s; }
  .wf-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important; }
  body { color-scheme: dark; }
  .ff-input { -webkit-appearance: none; appearance: none; background-repeat: no-repeat !important; background-position: right 14px center !important; }
  .ff-input::-webkit-contacts-auto-fill-button,
  .ff-input::-webkit-credentials-auto-fill-button,
  .ff-input::-ms-reveal,
  .ff-input::-ms-clear { display: none !important; visibility: hidden !important; pointer-events: none !important; position: absolute !important; right: -9999px !important; }
  
  .ff-input:focus { outline: none; border-color: #6366f1 !important; background: #161b26 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .ff-input:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
  
  /* Force dark background for all input types */
  input.ff-input {
    background-color: #0f1623 !important;
    background: #0f1623 !important;
    color: #f1f5f9 !important;
  }

  /* Autofill overrides */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active  {
    -webkit-box-shadow: 0 0 0 1000px #0f1623 inset !important;
    -webkit-text-fill-color: #f1f5f9 !important;
    transition: background-color 5000s ease-in-out 0s;
  }

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
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    },
    logoText: { fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: '#f1f5f9' },
    sidebarSection: { flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    sidebarLabel: { fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 6 },
    navItem: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none',
        background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left',
        transition: 'all 0.15s', cursor: 'pointer',
    },
    navItemActive: { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' },
    navIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', flexShrink: 0 },
    navIconActive: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 3px 10px rgba(99,102,241,0.4)', color: '#fff' },
    navLabel: { flex: 1 },
    teacherCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' },
    teacherAvatar: {
        width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
    },
    teacherName: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' },
    teacherRole: { fontSize: 11, color: '#475569', marginTop: 1 },
    logoutBtn: { background: 'none', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' },

    main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' },

    sidebarStats: { padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto' },
    sidebarStatItem: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px', marginBottom: 12 },
    sidebarStatLabel: { fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 },
    sidebarStatValue: { fontSize: 20, fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'baseline', gap: 4 },
    sidebarStatSub: { fontSize: 11, fontWeight: 700, color: '#475569' },
    sidebarFooter: { padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' },

    header: {
        padding: '28px 36px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10,
    },
    pageTitle: { fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' },
    pageSubtitle: { fontSize: 13, color: '#475569', marginTop: 3 },
    refreshBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', color: '#64748b', display: 'flex', alignItems: 'center' },
    primaryBtn: {
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none',
        borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s',
    },

    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, padding: '24px 36px 0' },
    statCard: {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 16,
        animation: 'fadeIn 0.4s ease',
    },
    statIcon: { width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    statLabel: { fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' },

    content: { padding: '28px 36px', flex: 1, animation: 'fadeIn 0.3s ease' },

    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' },
    cardHeader: {
        padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
    },
    cardTitle: { fontWeight: 800, fontSize: 15, color: '#f1f5f9' },
    liveIndicator: { width: 8, height: 8, background: '#22c55e', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' },
    badge: {
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)',
    },

    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '14px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.02)' },
    tr: { borderTop: '1px solid rgba(255,255,255,0.04)' },
    td: { padding: '16px 24px', verticalAlign: 'middle' },
    tdPrimary: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
    tdSecondary: { fontSize: 11, color: '#475569', marginTop: 2 },
    emptyCell: { padding: '60px 24px', textAlign: 'center' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14 },
    miniAvatar: { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 },

    alertSuccess: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, marginBottom: 20 },
    alertWarning: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, marginTop: 20 },

    loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 },
    wfGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 },
    wfCard: { borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' },
    runningBar: { height: 3, background: 'linear-gradient(90deg,#22c55e,#10b981,#22c55e)', animation: 'pulse 2s infinite', backgroundSize: '200%' },
    wfCardInner: { padding: 20 },
    wfIconWrap: { width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    wfName: { fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    wfMeta: { fontSize: 12, color: '#475569', marginBottom: 16 },
    wfActions: { display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' },
    wfToggleBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
    wfIconBtn: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', flexShrink: 0, transition: 'all 0.15s' },

    emptyWorkflows: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 },
    emptyIcon: { width: 70, height: 70, background: 'rgba(255,255,255,0.04)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },

    aiTip: { marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16 },
    aiTipIcon: { width: 36, height: 36, background: 'rgba(139,92,246,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

    inputLabel: { display: 'block', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
    inputIcon: { position: 'absolute', left: 16, pointerEvents: 'none', transition: 'color 0.2s', zIndex: 10 },
    input: { width: '100%', padding: '14px 16px', background: '#0f1623', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, color: '#f1f5f9', fontSize: 14, transition: 'all 0.2s', fontWeight: 500, outline: 'none' },
    studentItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 },

    apiKeyBox: { display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '4px 4px 4px 16px', marginBottom: 16, gap: 8 },
    apiKeyDisplay: { flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#a5b4fc', wordBreak: 'break-all', lineHeight: 1.5 },
    iconBtn: { width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#64748b', cursor: 'pointer' },
    instructionBox: { padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 },

    modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modal: { background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' },
    cancelBtn: { flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
    deleteBtn: { flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' },
};
