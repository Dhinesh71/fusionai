const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
require('dotenv').config();
const { runWorkflow } = require('./workflow-engine');
const db = require('./database');
const { extractText } = require('./file-parser');
const { generateConditionLogic, generateWorkflowFromPrompt, processAITask } = require('./ai');

// Multer — store file in memory for parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT'));
  },
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Separate multer for announcements (store on disk)
const annStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/announcements';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});
const annUpload = multer({
  storage: annStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB for announcements
});

// ══════════════════════════════════════════════════════════════
// TEACHER AUTH
// ══════════════════════════════════════════════════════════════

// Teacher Signup
app.post('/api/teacher/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    if (await db.teacherExists(username)) return res.status(409).json({ error: 'Username already taken' });
    await db.createTeacher(username, password);
    res.json({ success: true });
  } catch (err) {
    console.error('[Signup]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Teacher Login
app.post('/api/teacher/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const teacher = await db.getTeacher(username);
    if (!teacher || teacher.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, username, id: teacher.id, apiKey: teacher.api_key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Create Student Account
app.post('/api/teacher/create-student', async (req, res) => {
  const { teacherUsername, studentUsername, studentPassword, studentEmail,
    registerNumber, fullName, department, year, semester, phone, parentPhone, accommodation } = req.body;
  try {
    const teacher = await db.getTeacher(teacherUsername);
    if (!teacher) return res.status(401).json({ error: 'Teacher not found' });
    if (await db.studentExists(studentUsername)) return res.status(409).json({ error: 'Student username already taken' });
    const student = await db.createStudent(studentUsername, studentPassword, studentEmail, teacher.id, {
      registerNumber, fullName, department, year, semester, phone, parentPhone, accommodation
    });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Update student profile
app.put('/api/teacher/update-student/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await db.updateStudent(id, req.body);
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Delete a student
app.delete('/api/teacher/delete-student/:id', async (req, res) => {
  try {
    await db.deleteStudent(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Teacher: Bulk Create Students from Excel/CSV
 * Expected columns: username, password, email
 */
app.post('/api/teacher/bulk-students', upload.single('file'), async (req, res) => {
  const { teacherUsername } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!teacherUsername) return res.status(400).json({ error: 'teacherUsername required' });

  try {
    const teacher = await db.getTeacher(teacherUsername);
    if (!teacher) return res.status(401).json({ error: 'Teacher not found' });

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const username = row.username || row.Username || row.name;
      const password = row.password || row.Password || '123456'; // Default password if missing
      const email = row.email || row.Email;

      if (!username || !email) {
        results.errors.push(`Row ${JSON.stringify(row)}: Missing username or email`);
        results.skipped++;
        continue;
      }

      try {
        if (await db.studentExists(String(username))) {
          results.skipped++;
          continue;
        }
        await db.createStudent(String(username), String(password), String(email), teacher.id);
        results.created++;
      } catch (err) {
        results.errors.push(`User ${username}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('[BulkStudentImport]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Teacher: Bulk Create Announcements from Excel/CSV
 * Expected columns: title, body/message/content, category (optional)
 */
app.post('/api/teacher/bulk-announcements', upload.single('file'), async (req, res) => {
  const { teacherId } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

  try {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const title = row.title || row.Title || row.subject || row.Subject;
      const body = row.body || row.message || row.Message || row.text || row.Content || row.content;
      const category = row.category || row.Category || 'General';

      if (!title || !body) {
        results.errors.push(`Row omitted: Missing title or body (Title found: ${title})`);
        results.skipped++;
        continue;
      }

      try {
        await db.createAnnouncement(teacherId, String(title), String(body), String(category));
        results.created++;
      } catch (err) {
        results.errors.push(`Row ${title}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('[BulkAnnImport]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Teacher: AI Automate Task (Excel + AI Reasoning)
 * Uploads an Excel file and lets AI decide how to process it based on teacher prompt.
 */
app.post('/api/ai/automate', upload.single('file'), async (req, res) => {
  const { teacherId, instruction } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!instruction) return res.status(400).json({ error: 'Instruction required' });

  try {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Call AI to determine mapping and action
    const aiResult = await processAITask(rawRows, instruction);
    const { type, mapped } = aiResult;

    if (!type || !mapped || !Array.isArray(mapped)) {
      return res.status(500).json({ error: 'AI failed to interpret data. Try a clearer instruction.' });
    }

    const results = { type, created: 0, skipped: 0, errors: [] };

    for (const item of mapped) {
      try {
        if (type === 'STUDENTS') {
          if (await db.studentExists(String(item.username))) {
            results.skipped++;
            continue;
          }
          await db.createStudent(String(item.username), String(item.password || '123456'), String(item.email), Number(teacherId));
          results.created++;
        } else if (type === 'ANNOUNCEMENTS') {
          await db.createAnnouncement(Number(teacherId), String(item.title), String(item.body), String(item.category || 'General'));
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Row error: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('[AIAutomateTask]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Get students
app.get('/api/teacher/:username/students', async (req, res) => {
  try {
    const teacher = await db.getTeacher(req.params.username);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const students = await db.getStudentsByTeacher(teacher.id);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Generate / Regenerate API Key
app.post('/api/teacher/generate-key', async (req, res) => {
  const { teacherUsername } = req.body;
  try {
    const teacher = await db.getTeacher(teacherUsername);
    if (!teacher) return res.status(401).json({ error: 'Teacher not found' });
    const key = `ff_${Math.random().toString(36).substr(2, 16)}`;
    await db.setTeacherApiKey(teacher.id, key);
    res.json({ key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validate API Key — checks BOTH teacher and student keys
app.post('/api/validate-key', async (req, res) => {
  const { apiKey } = req.body;
  try {
    // Check teacher first
    const teacher = await db.getTeacherByApiKey(apiKey);
    if (teacher) {
      return res.json({ valid: true, ownerType: 'teacher', teacherId: teacher.id, teacherUsername: teacher.username });
    }
    // Check student
    const student = await db.getStudentByApiKey(apiKey);
    if (student) {
      return res.json({ valid: true, ownerType: 'student', studentId: student.id, studentUsername: student.username, teacherId: student.teacher_id });
    }
    return res.status(401).json({ error: 'Invalid API Key' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// STUDENT AUTH
// ══════════════════════════════════════════════════════════════

app.post('/api/student/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const student = await db.getStudent(username);
    if (!student || student.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({
      success: true,
      id: student.id,
      username: student.username,
      email: student.email,
      teacherId: student.teacher_id,
      teacherUsername: student.teachers?.username,
      apiKey: student.api_key || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: Generate / Regenerate own API Key
app.post('/api/student/generate-key', async (req, res) => {
  const { studentUsername } = req.body;
  try {
    const student = await db.getStudent(studentUsername);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const key = `fs_${Math.random().toString(36).substr(2, 16)}`;
    await db.setStudentApiKey(student.id, key);
    res.json({ key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// SUBMISSIONS & AI GRADING
// ══════════════════════════════════════════════════════════════

/**
 * Helper to run the grading workflow in the background
 */
async function processGrading(workflow, submissionId, context) {
  let finalScore = null;
  let finalStatus = 'Completed';

  try {
    const result = await runWorkflow(workflow.nodes, workflow.edges, context);
    const nodeResults = result.state.nodeResults;

    // Find AI result
    const aiNode = workflow.nodes.find(n => n.type === 'ai');
    const aiResult = aiNode ? nodeResults[aiNode.id] : Object.values(nodeResults).find(r => r?.output !== undefined);

    finalScore = aiResult?.output ?? null;
  } catch (err) {
    console.error('[Background Grading Error]', err.message);
    finalStatus = 'Failed';
  }

  // Update DB once done
  await db.updateSubmission(submissionId, finalScore ? String(finalScore) : null, finalStatus);
  console.log(`[AsyncGrading] Completed for ${submissionId} (Score: ${finalScore})`);
}

app.post('/api/submit', async (req, res) => {
  const { studentUsername, assignmentText } = req.body;  // No apiKey needed
  try {
    const student = await db.getStudent(studentUsername);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.teacher_id) return res.status(400).json({ error: 'Student not linked to a teacher.' });

    const submissionRecord = {
      id: `sub_${Date.now()}`,
      studentUsername,
      email: student.email,
      teacherId: student.teacher_id,   // auto from DB
      assignmentText,
      score: null,
      status: 'Processing',
      submittedAt: new Date().toISOString(),
    };

    await db.createSubmission(submissionRecord);

    // Run AI workflow — only 'running' submission workflows
    const workflows = await db.getWorkflowsByTeacher(student.teacher_id);
    const workflow = workflows.find(wf => {
      if (wf.status !== 'running') return false;
      const trigger = wf.nodes?.find(n => n.type === 'trigger');
      return trigger && (!trigger.data?.triggerType || trigger.data.triggerType === 'submission');
    });

    if (workflow) {
      // Execute in background
      processGrading(workflow, submissionRecord.id, {
        assignmentText,
        studentEmail: student.email,
        studentUsername,
        studentName: student.full_name || student.username,
        studentId: student.id,
      });
    } else {
      await db.updateSubmission(submissionRecord.id, null, 'No active workflow');
      submissionRecord.status = 'No active workflow';
    }

    res.json({ success: true, submission: submissionRecord });
  } catch (err) {
    console.error('[Submit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── FILE UPLOAD Submission ──────────────────────────────────────────────────
app.post('/api/submit-file', upload.single('assignment'), async (req, res) => {
  try {
    const { studentUsername } = req.body;   // No API key needed — teacher is auto-resolved
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!studentUsername) return res.status(400).json({ error: 'studentUsername required.' });

    // Look up student — teacher_id is already stored at account creation
    const student = await db.getStudent(studentUsername);
    if (!student) return res.status(404).json({ error: 'Student account not found.' });
    if (!student.teacher_id) return res.status(400).json({ error: 'Student is not linked to a teacher. Contact your teacher.' });

    // Extract text from the uploaded file
    console.log(`[FileUpload] ${studentUsername} → ${file.originalname} (teacher: ${student.teacher_id})`);
    const assignmentText = await extractText(file.buffer, file.originalname);

    if (!assignmentText || assignmentText.trim().length < 10) {
      return res.status(400).json({ error: 'Could not extract enough text from the file. Please try a different file.' });
    }

    const submissionRecord = {
      id: `sub_${Date.now()}`,
      studentUsername,
      email: student.email,
      teacherId: student.teacher_id,   // auto from DB
      assignmentText,
      fileName: file.originalname,
      score: null,
      status: 'Processing',
      submittedAt: new Date().toISOString(),
    };

    await db.createSubmission(submissionRecord);

    // Run AI grading — only 'running' submission workflows
    const workflows = await db.getWorkflowsByTeacher(student.teacher_id);
    const workflow = workflows.find(wf => {
      if (wf.status !== 'running') return false;
      const trigger = wf.nodes?.find(n => n.type === 'trigger');
      return trigger && (!trigger.data?.triggerType || trigger.data.triggerType === 'submission');
    });

    if (workflow) {
      // Execute in background
      processGrading(workflow, submissionRecord.id, {
        assignmentText,
        studentEmail: student.email,
        studentUsername,
        studentName: student.full_name || student.username,
        studentId: student.id,
      });
    } else {
      const status = 'No active workflow — contact your teacher';
      await db.updateSubmission(submissionRecord.id, null, status);
      submissionRecord.status = status;
    }

    res.json({ success: true, submission: submissionRecord });
  } catch (err) {
    console.error('[FileSubmit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: get submissions
app.get('/api/submissions', async (req, res) => {
  const { teacherId, teacherUsername } = req.query;
  try {
    let id = teacherId;
    if (!id && teacherUsername) {
      const teacher = await db.getTeacher(teacherUsername);
      id = teacher?.id;
    }
    if (!id) return res.status(400).json({ error: 'teacherId required' });
    const subs = await db.getSubmissionsByTeacher(id);
    // Normalize field names for the frontend
    res.json(subs.map(s => ({
      ...s,
      studentUsername: s.student_username,
      email: s.student_email,
      assignmentText: s.assignment_text,
      submittedAt: s.submitted_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: get their submissions
app.get('/api/submissions/student/:username', async (req, res) => {
  try {
    const subs = await db.getSubmissionsByStudent(req.params.username);
    res.json(subs.map(s => ({
      ...s,
      studentUsername: s.student_username,
      assignmentText: s.assignment_text,
      submittedAt: s.submitted_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// WORKFLOWS
// ══════════════════════════════════════════════════════════════

app.get('/api/workflows', async (req, res) => {
  try {
    const { teacherId, studentId } = req.query;
    if (studentId) {
      const workflows = await db.getWorkflowsByStudent(studentId);
      return res.json(workflows);
    }
    if (teacherId) {
      const workflows = await db.getWorkflowsByTeacher(teacherId);
      return res.json(workflows);
    }
    const all = await db.getAllWorkflows();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await db.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workflows', async (req, res) => {
  const { id, name, nodes, edges, teacherId, studentId, status } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const wf = await db.saveWorkflow(
      id,
      name || 'Untitled Workflow',
      nodes,
      edges,
      { teacherId: teacherId || null, studentId: studentId || null },
      status || 'stopped'
    );
    res.json({ success: true, id: wf.id, workflow: wf });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Activate a saved workflow (Start running) ─────────────────
app.post('/api/workflows/:id/run', async (req, res) => {
  try {
    await db.updateWorkflowStatus(req.params.id, 'running');
    res.json({ success: true, status: 'running', message: 'Workflow is now live. Student submissions will be auto-graded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stop a running workflow ────────────────────────────────────
app.patch('/api/workflows/:id/status', async (req, res) => {
  const { status } = req.body; // 'running' | 'stopped'
  if (!['running', 'stopped'].includes(status)) return res.status(400).json({ error: 'status must be running or stopped' });
  try {
    await db.updateWorkflowStatus(req.params.id, status);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workflows/:id', async (req, res) => {
  try {
    await db.deleteWorkflow(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workflows/execute', async (req, res) => {
  const { workflow, triggerData } = req.body;
  try {
    const result = await runWorkflow(workflow.nodes, workflow.edges, triggerData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════════════════════════

// Teacher: post a new announcement (with optional file)
app.post('/api/announcements', annUpload.single('attachment'), async (req, res) => {
  const { teacherId, title, body, category } = req.body;
  const file = req.file;

  if (!teacherId || !title || !body) return res.status(400).json({ error: 'teacherId, title and body are required' });

  try {
    const attachmentUrl = file ? `/uploads/announcements/${file.filename}` : null;
    const attachmentName = file ? file.originalname : null;

    const ann = await db.createAnnouncement(teacherId, title, body, category, attachmentUrl, attachmentName);
    res.json({ success: true, announcement: ann });
  } catch (err) {
    console.error('[AnnouncementPost]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: get their own announcements
app.get('/api/announcements/teacher/:teacherId', async (req, res) => {
  try {
    const anns = await db.getAnnouncementsByTeacher(req.params.teacherId);
    res.json(anns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: get announcements from their teacher
app.get('/api/announcements/student/:teacherId', async (req, res) => {
  try {
    const anns = await db.getAnnouncementsByStudent(req.params.teacherId);
    res.json(anns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: delete an announcement
app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await db.deleteAnnouncement(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// AI CONDITION BUILDER
// ══════════════════════════════════════════════════════════════
app.post('/api/ai/condition-builder', async (req, res) => {
  const { prompt } = req.body;
  try {
    const logic = await generateConditionLogic(prompt);
    res.json({ success: true, logic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/generate-workflow', async (req, res) => {
  const { description, apiKey } = req.body;
  if (!description || !description.trim()) return res.status(400).json({ error: 'description is required' });
  try {
    const workflow = await generateWorkflowFromPrompt(description.trim(), apiKey);
    res.json({ success: true, workflow });
  } catch (err) {
    console.error('[AI Workflow Gen]', err.message);
    res.status(500).json({ error: err.message });
  }
});



// ══════════════════════════════════════════════════════════════
// ATTENDANCE ROUTES
// ══════════════════════════════════════════════════════════════

// GET session + records for a given date
app.get('/api/teacher/attendance', async (req, res) => {
  const { teacherId, date } = req.query;
  if (!teacherId || !date) return res.status(400).json({ error: 'teacherId and date required' });
  try {
    const result = await db.getAttendanceByDate(teacherId, date);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create/get session for today (or any date)
app.post('/api/teacher/attendance/session', async (req, res) => {
  const { teacherId, date } = req.body;
  if (!teacherId || !date) return res.status(400).json({ error: 'teacherId and date required' });
  try {
    const session = await db.getOrCreateSession(teacherId, date);
    res.json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Helper to run attendance-triggered workflows
 */
async function processAttendanceTrigger(teacherId, studentId, status) {
  try {
    const student = await db.getStudentById(studentId);
    if (!student) return;

    // Fetch workflows for this teacher
    const workflows = await db.getWorkflowsByTeacher(teacherId);
    const activeWorkflows = workflows.filter(wf => wf.status === 'running');

    for (const workflow of activeWorkflows) {
      // Check if this workflow has an Attendance Trigger
      const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
      if (triggerNode && triggerNode.data?.triggerType === 'attendance') {
        console.log(`[Flow] Triggering "${workflow.name}" for student: ${student.username}...`);

        // Execute in background
        runWorkflow(workflow.nodes, workflow.edges, {
          studentId: student.id,
          studentUsername: student.username,
          studentName: student.full_name,
          studentPhone: student.phone,
          parentPhone: student.parent_phone,
          attendanceStatus: status,
          date: new Date().toISOString().split('T')[0]
        }).catch(err => console.error(`[Workflow Error ${workflow.id}]`, err));
      }
    }
  } catch (err) {
    console.error('[Attendance Trigger Error]', err.message);
  }
}

// PUT mark a single student
app.put('/api/teacher/attendance/record', async (req, res) => {
  const { sessionId, studentId, status, teacherId } = req.body;
  if (!sessionId || !studentId || !status) return res.status(400).json({ error: 'sessionId, studentId, status required' });
  try {
    const record = await db.upsertAttendanceRecord(sessionId, studentId, status);

    // Trigger workflows
    if (teacherId) {
      processAttendanceTrigger(teacherId, studentId, status);
    }

    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT bulk mark all students
app.put('/api/teacher/attendance/bulk', async (req, res) => {
  const { sessionId, studentIds, status, teacherId } = req.body;
  if (!sessionId || !studentIds?.length || !status) return res.status(400).json({ error: 'sessionId, studentIds, status required' });
  try {
    await db.bulkUpsertAttendance(sessionId, studentIds, status);

    // Trigger workflows for each student
    if (teacherId) {
      studentIds.forEach(sid => processAttendanceTrigger(teacherId, sid, status));
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET attendance summary for sidebar stats
app.get('/api/teacher/attendance/summary', async (req, res) => {
  const { teacherId } = req.query;
  if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
  try {
    const result = await db.getAttendanceSummary(teacherId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/attendance/summary', async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  try {
    const summary = await db.getStudentAttendanceSummary(studentId);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET export attendance for a SINGLE student as CSV
app.get('/api/student/attendance/export', async (req, res) => {
  const { studentId, from, to } = req.query;
  if (!studentId || !from || !to) return res.status(400).json({ error: 'studentId, from, to required' });
  try {
    const history = await db.getStudentAttendanceRange(studentId, from, to);
    if (!history || history.length === 0) return res.status(404).json({ error: 'No attendance records in this range' });

    const header = ['Date', 'Status'];
    const rows = history.map(h => [h.date, h.status === 'present' ? 'P' : 'A']);

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="my_attendance_${from}_to_${to}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET export attendance range as CSV download
app.get('/api/teacher/attendance/export', async (req, res) => {
  const { teacherId, from, to } = req.query;
  if (!teacherId || !from || !to) return res.status(400).json({ error: 'teacherId, from, to required' });
  try {
    const students = await db.getStudentsByTeacher(teacherId);
    const { sessions, records } = await db.getAttendanceRange(teacherId, from, to);
    if (!sessions || sessions.length === 0) return res.status(404).json({ error: 'No attendance data in range' });

    // Build CSV
    const dateHeaders = sessions.map(s => s.date);
    const headerRow = ['Register No.', 'Name', 'Username', ...dateHeaders, 'Present', 'Absent', 'Percentage'];

    const rows = students.map(st => {
      let presentCount = 0, absentCount = 0;
      const dateCols = sessions.map(sess => {
        const rec = records.find(r => r.session_id === sess.id && r.student_id === st.id);
        const status = rec ? rec.status : '—';
        if (status === 'present') presentCount++;
        if (status === 'absent') absentCount++;
        return status === 'present' ? 'P' : status === 'absent' ? 'A' : '—';
      });
      const total = presentCount + absentCount;
      const pct = total > 0 ? Math.round((presentCount / total) * 100) + '%' : '—';
      return [st.register_number || '', st.full_name || st.username, st.username, ...dateCols, presentCount, absentCount, pct];
    });

    const csvContent = [headerRow, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${from}_to_${to}.csv"`);
    res.send('\uFEFF' + csvContent);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const { initWhatsApp } = require('./whatsapp');

// ══════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════
app.listen(process.env.PORT || 3001, () => {
  console.log(`✅ Backend running on port ${process.env.PORT || 3001}`);
  initWhatsApp();
});
