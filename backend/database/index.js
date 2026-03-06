const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && supabaseKey !== 'your_supabase_anon_key_here') {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [Supabase] Connected successfully.');
} else {
    console.warn('⚠️  [Supabase] Not configured — running in mock mode.');
}

function getClient() {
    if (!supabase) throw new Error('Supabase not configured');
    return supabase;
}

// ══════════════════════════════════════════════════════════════
// TEACHER AUTH
// ══════════════════════════════════════════════════════════════

async function teacherExists(username) {
    const { data } = await getClient().from('teachers').select('id').eq('username', username).single();
    return !!data;
}

async function createTeacher(username, password) {
    const { data, error } = await getClient().from('teachers').insert({ username, password }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function getTeacher(username) {
    const { data, error } = await getClient().from('teachers').select('*').eq('username', username).single();
    if (error) return null;
    return data;
}

async function getTeacherById(id) {
    const { data } = await getClient().from('teachers').select('*').eq('id', id).single();
    return data;
}

async function setTeacherApiKey(teacherId, apiKey) {
    const { error } = await getClient().from('teachers').update({ api_key: apiKey }).eq('id', teacherId);
    if (error) throw new Error(error.message);
}

async function getTeacherByApiKey(apiKey) {
    const { data } = await getClient().from('teachers').select('*').eq('api_key', apiKey).single();
    return data;
}

// ══════════════════════════════════════════════════════════════
// STUDENT AUTH
// ══════════════════════════════════════════════════════════════

async function studentExists(username) {
    const { data } = await getClient().from('students').select('id').eq('username', username).single();
    return !!data;
}

async function createStudent(username, password, email, teacherId, profile = {}) {
    const { registerNumber, fullName, department, year, semester, phone, parentPhone, accommodation } = profile;
    const { data, error } = await getClient().from('students').insert({
        username, password, email, teacher_id: teacherId,
        register_number: registerNumber || null,
        full_name: fullName || null,
        department: department || null,
        year: year ? Number(year) : null,
        semester: semester ? Number(semester) : null,
        phone: phone || null,
        parent_phone: parentPhone || null,
        accommodation: accommodation || 'Day Scholar',
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function getStudent(username) {
    const { data } = await getClient().from('students').select('*, teachers(username)').eq('username', username).single();
    return data;
}

async function getStudentById(id) {
    const { data } = await getClient().from('students').select('*').eq('id', id).single();
    return data;
}

async function getStudentsByTeacher(teacherId) {
    const { data } = await getClient().from('students').select('*').eq('teacher_id', teacherId);
    return data || [];
}

async function updateStudent(id, profile) {
    const { fullName, department, year, semester, phone, parentPhone, accommodation, registerNumber, email } = profile;
    const update = {};
    if (fullName !== undefined) update.full_name = fullName;
    if (department !== undefined) update.department = department;
    if (year !== undefined) update.year = year ? Number(year) : null;
    if (semester !== undefined) update.semester = semester ? Number(semester) : null;
    if (phone !== undefined) update.phone = phone;
    if (parentPhone !== undefined) update.parent_phone = parentPhone;
    if (accommodation !== undefined) update.accommodation = accommodation;
    if (registerNumber !== undefined) update.register_number = registerNumber;
    if (email !== undefined) update.email = email;
    const { data, error } = await getClient().from('students').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function deleteStudent(id) {
    const { error } = await getClient().from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// Student-specific API key (for their personal automations)
async function setStudentApiKey(studentId, apiKey) {
    const { error } = await getClient().from('students').update({ api_key: apiKey }).eq('id', studentId);
    if (error) throw new Error(error.message);
}

async function getStudentByApiKey(apiKey) {
    const { data } = await getClient().from('students').select('*').eq('api_key', apiKey).single();
    return data;
}

// ══════════════════════════════════════════════════════════════
// WORKFLOWS
// ══════════════════════════════════════════════════════════════

/**
 * Save (upsert) a workflow.
 * Pass teacherId  → a teacher-owned workflow
 * Pass studentId  → a student-owned personal workflow
 */
async function saveWorkflow(id, name, nodes, edges, { teacherId = null, studentId = null } = {}, status = 'stopped') {
    const { data, error } = await getClient()
        .from('workflows')
        .upsert({ id, name, nodes, edges, teacher_id: teacherId, student_id: studentId, status })
        .select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function updateWorkflowStatus(id, status) {
    const updateData = { status };
    if (status === 'running') updateData.started_at = new Date().toISOString();
    if (status === 'stopped') updateData.stopped_at = new Date().toISOString();
    const { error } = await getClient().from('workflows').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
}

// Teacher's own workflows (exclude student-owned rows)
async function getWorkflowsByTeacher(teacherId) {
    const { data } = await getClient()
        .from('workflows')
        .select('*')
        .eq('teacher_id', teacherId)
        .is('student_id', null)         // only teacher-owned
        .order('created_at', { ascending: false });
    return data || [];
}

// Student's own personal workflows
async function getWorkflowsByStudent(studentId) {
    const { data } = await getClient()
        .from('workflows')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
    return data || [];
}

async function getWorkflow(id) {
    const { data } = await getClient().from('workflows').select('*').eq('id', id).single();
    return data;
}

async function getAllWorkflows() {
    const { data } = await getClient().from('workflows').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function deleteWorkflow(id) {
    const { error } = await getClient().from('workflows').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ══════════════════════════════════════════════════════════════
// SUBMISSIONS
// ══════════════════════════════════════════════════════════════

async function createSubmission(submission) {
    const { data, error } = await getClient().from('submissions').insert({
        id: submission.id,
        student_username: submission.studentUsername,
        student_email: submission.email,
        teacher_id: submission.teacherId,
        assignment_text: submission.assignmentText,
        score: submission.score,
        status: submission.status,
        submitted_at: submission.submittedAt,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function updateSubmission(id, score, status) {
    const { error } = await getClient().from('submissions').update({ score, status }).eq('id', id);
    if (error) throw new Error(error.message);
}

async function getSubmissionsByTeacher(teacherId) {
    const { data } = await getClient().from('submissions').select('*').eq('teacher_id', teacherId).order('submitted_at', { ascending: false });
    return data || [];
}

async function getSubmissionsByStudent(studentUsername) {
    const { data } = await getClient().from('submissions').select('*').eq('student_username', studentUsername).order('submitted_at', { ascending: false });
    return data || [];
}

// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════════════════════════

async function createAnnouncement(teacherId, title, body, category, attachmentUrl = null, attachmentName = null) {
    const { data, error } = await getClient().from('announcements').insert({
        teacher_id: teacherId,
        title,
        body,
        category: category || 'General',
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function getAnnouncementsByTeacher(teacherId) {
    const { data } = await getClient()
        .from('announcements')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
    return data || [];
}

// Students fetch announcements by their teacher's id
async function getAnnouncementsByStudent(teacherId) {
    const { data } = await getClient()
        .from('announcements')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
    return data || [];
}

async function deleteAnnouncement(id) {
    const { error } = await getClient().from('announcements').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ══════════════════════════════════════════════════════════════
// WORKFLOW RUNS (existing feature)
// ══════════════════════════════════════════════════════════════

async function createRunLog(workflowId, inputData) {
    if (!supabase) { console.log('[DB Mock] createRunLog'); return 'mock-run-id'; }
    const { data, error } = await supabase.from('workflow_runs').insert({
        workflow_id: workflowId,
        input_data: inputData,
        status: 'pending',
    }).select('run_id').single();
    if (error) { console.error('[DB]', error.message); return null; }
    return data.run_id;
}

async function updateRunLog(runId, state, status, errorMsg = '') {
    if (!supabase || !runId) { console.log(`[DB Mock] updateRunLog ${runId} → ${status}`); return; }
    const { error } = await supabase.from('workflow_runs').update({ output_data: state, status, error_log: errorMsg }).eq('run_id', runId);
    if (error) console.error('[DB]', error.message);
}

// ══════════════════════════════════════════════════════════════
// ATTENDANCE
// ══════════════════════════════════════════════════════════════

/** Get existing session for a date, or create one */
async function getOrCreateSession(teacherId, date) {
    const db = getClient();
    // Try to fetch existing
    const { data: existing } = await db
        .from('attendance_sessions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', date)
        .single();
    if (existing) return existing;
    // Create new
    const { data, error } = await db
        .from('attendance_sessions')
        .insert({ teacher_id: teacherId, date })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/** Mark a single student present or absent for a session */
async function upsertAttendanceRecord(sessionId, studentId, status) {
    const { data, error } = await getClient()
        .from('attendance_records')
        .upsert({ session_id: sessionId, student_id: studentId, status }, { onConflict: 'session_id,student_id' })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/** Bulk mark all students to a given status for a session */
async function bulkUpsertAttendance(sessionId, studentIds, status) {
    const records = studentIds.map(sid => ({ session_id: sessionId, student_id: sid, status }));
    const { error } = await getClient()
        .from('attendance_records')
        .upsert(records, { onConflict: 'session_id,student_id' });
    if (error) throw new Error(error.message);
}

/** Get all attendance records for a given date */
async function getAttendanceByDate(teacherId, date) {
    const db = getClient();
    const { data: session } = await db
        .from('attendance_sessions')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('date', date)
        .single();
    if (!session) return { sessionId: null, records: [] };
    const { data: records } = await db
        .from('attendance_records')
        .select('student_id, status')
        .eq('session_id', session.id);
    return { sessionId: session.id, records: records || [] };
}

/** Get all records for a date range (for export) */
async function getAttendanceRange(teacherId, from, to) {
    const db = getClient();
    const { data: sessions } = await db
        .from('attendance_sessions')
        .select('id, date')
        .eq('teacher_id', teacherId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
    if (!sessions || sessions.length === 0) return [];
    const sessionIds = sessions.map(s => s.id);
    const { data: records } = await db
        .from('attendance_records')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds);
    return { sessions, records: records || [] };
}

/** Get attendance summary (total sessions, present count per student) */
async function getAttendanceSummary(teacherId) {
    const db = getClient();
    const { data: sessions } = await db
        .from('attendance_sessions')
        .select('id')
        .eq('teacher_id', teacherId);
    if (!sessions || sessions.length === 0) return { totalSessions: 0, summary: [] };
    const sessionIds = sessions.map(s => s.id);
    const { data: records } = await db
        .from('attendance_records')
        .select('student_id, status')
        .in('session_id', sessionIds);
    // Group by student
    const map = {};
    (records || []).forEach(r => {
        if (!map[r.student_id]) map[r.student_id] = { present: 0, absent: 0 };
        map[r.student_id][r.status]++;
    });
    const summary = Object.entries(map).map(([studentId, counts]) => ({
        studentId,
        present: counts.present,
        absent: counts.absent,
        total: counts.present + counts.absent,
        percentage: Math.round((counts.present / (counts.present + counts.absent)) * 100),
    }));
    return { totalSessions: sessions.length, summary };
}

/** Get summary for a SINGLE student */
async function getStudentAttendanceSummary(studentId) {
    const db = getClient();
    const { data: records } = await db
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId);
    if (!records || records.length === 0) return { present: 0, absent: 0, total: 0, percentage: 0 };
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const total = present + absent;
    return {
        present,
        absent,
        total,
        percentage: Math.round((present / total) * 100),
    };
}

/** Get attendance history for a SINGLE student in a range */
async function getStudentAttendanceRange(studentId, from, to) {
    const db = getClient();
    const { data, error } = await db
        .from('attendance_records')
        .select(`
            status,
            attendance_sessions!inner(date)
        `)
        .eq('student_id', studentId)
        .gte('attendance_sessions.date', from)
        .lte('attendance_sessions.date', to);

    if (error) throw new Error(error.message);

    return (data || []).map(r => ({
        date: r.attendance_sessions.date,
        status: r.status
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = {
    // Teacher
    teacherExists, createTeacher, getTeacher, getTeacherById, setTeacherApiKey, getTeacherByApiKey,
    // Student
    studentExists, createStudent, getStudent, getStudentById, getStudentsByTeacher,
    updateStudent, deleteStudent,
    setStudentApiKey, getStudentByApiKey,
    // Workflow
    saveWorkflow, updateWorkflowStatus,
    getWorkflowsByTeacher, getWorkflowsByStudent,
    getAllWorkflows, getWorkflow, deleteWorkflow,
    // Submissions
    createSubmission, updateSubmission, getSubmissionsByTeacher, getSubmissionsByStudent,
    // Announcements
    createAnnouncement, getAnnouncementsByTeacher, getAnnouncementsByStudent, deleteAnnouncement,
    // Attendance
    getOrCreateSession, upsertAttendanceRecord, bulkUpsertAttendance,
    getAttendanceByDate, getAttendanceRange, getAttendanceSummary,
    getStudentAttendanceSummary, getStudentAttendanceRange,
    // Workflow runs
    createRunLog, updateRunLog,
};

