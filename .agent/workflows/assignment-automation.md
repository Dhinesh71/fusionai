---
description: Assignment Automation Workflow — student submits, AI grades, email is sent
---

# Assignment Automation Workflow

This workflow describes the end-to-end process for automating assignment grading in FusionFlow.
A student submits an assignment → the AI checks and scores it → a results email is automatically sent.

---

## Prerequisites

Before running this workflow, make sure the following are in place:

1. **Backend is running** on port 3001 (`npm run dev` in the `fusionflow` root or `node index.js` in `backend/`).
2. **Frontend is running** on port 5173 (Vite dev server).
3. **Supabase** credentials are set in `backend/.env` (`SUPABASE_URL`, `SUPABASE_KEY`).
4. **Groq API Key** is set in `backend/.env` (`GROQ_API_KEY`).
5. **Gmail credentials** are set in `backend/.env` (`GMAIL_USER`, `GMAIL_PASS`) for real email delivery.
   - If not set, emails are **simulated** (logged to console only — no real mail sent).

---

## Step 1 — Teacher: Sign Up / Log In

1. Open the FusionFlow app in a browser (usually `http://localhost:5173`).
2. Navigate to **Login** → choose **Teacher Login**.
3. If you have no account, click **Sign Up** and create a teacher account.
4. After login you will land on the **Teacher Console** dashboard.

---

## Step 2 — Teacher: Generate an API Key

1. In the Teacher Console, click the **API Key** tab.
2. Click **⚡ Generate API Key**.
3. Copy the generated key (click the copy icon). You will need it in Step 4.

---

## Step 3 — Teacher: Create Student Accounts

1. In the Teacher Console, click the **Manage Students** tab.
2. Fill in **Username**, **Password**, and **Email** for each student.
3. Click **Create Student Account**.
4. Repeat for every student in your class.
   - Each student is automatically linked to your teacher account.

---

## Step 4 — Teacher: Build the Grading Workflow in the Automation Builder

1. Click the **Automation Builder** link (in the sidebar or from the API Key instructions).
2. The builder opens at `/builder`.  
   **Optional shortcut:** append `?template=assignment` to the URL to auto-load the pre-built assignment grading template:
   ```
   http://localhost:5173/builder?template=assignment
   ```
3. The template contains five nodes wired together:

   | Node | Type | Purpose |
   |---|---|---|
   | Assignment Submission | Trigger | Entry point — receives assignment text & student info |
   | Grade Assignment | AI Agent | Sends the text to the Groq LLM and returns a score (0-100) |
   | Pass/Fail Check | Condition | Checks if `node_2.output < 50` (fail threshold) |
   | Request Rewrite | Action (Email) | Sends a "please resubmit" email when score < 50 |
   | Send Pass Email | Action (Email) | Sends a "congratulations" email when score ≥ 50 |

4. **Click the Trigger node** → a config panel opens on the right.
5. Paste your **Teacher API Key** (from Step 2) into the input field.
6. Click **Link & Confirm** — you should see your username and student count verified.
7. *(Optional)* Customize the **AI Agent** node:
   - Change the **System Persona** to describe your grading rubric.
   - Edit the **User Prompt** — use `{{triggerData.assignmentText}}` to inject the submission.
8. *(Optional)* Edit the **Action** nodes to customise the email message body.
   - Use `{{node_2.output}}` to embed the AI score in the message.
9. Click **Deploy Workflow** (top right). The workflow is saved with status `running`.

---

## Step 5 — Teacher: Verify the Workflow is Running

1. Return to the **Teacher Console** (`/teacher`).
2. A running workflow is automatically picked up for every new submission — no extra toggle needed.
   - Only workflows with status `running` are used for grading.

---

## Step 6 — Student: Log In and Submit Assignment

1. The student opens the app and clicks **Student Login**.
2. Enter the credentials created by the teacher in Step 3.
3. After login, the student lands on the **Student Dashboard**.
4. The student can submit an assignment in two ways:

   **Option A — Text Submission**
   - Paste or type the assignment text in the text box.
   - Click **Submit**.
   - The backend endpoint hit is: `POST /api/submit`

   **Option B — File Upload**
   - Click **Upload File** and choose a `.pdf`, `.docx`, `.ppt`, or `.txt` file.
   - The backend extracts text automatically.
   - Click **Submit**.
   - The backend endpoint hit is: `POST /api/submit-file`

---

## Step 7 — AI Grading (Automatic)

When a submission is received the backend does the following automatically:

1. Looks up the student's linked `teacher_id` from the database.
2. Fetches all workflows belonging to that teacher.
3. Selects the first workflow with `status = 'running'`.
4. Runs the **workflow engine** (`workflow-engine/index.js`) with:
   - `triggerData.assignmentText` — the extracted or pasted text
   - `triggerData.studentEmail` — the student's email address
   - `triggerData.studentUsername` — the student's username
5. The **AI node** sends the text to Groq using the configured model (default: `llama-3.3-70b-versatile`).
6. The AI returns a score (0-100).
7. The **Condition node** evaluates whether the score is below the threshold (default: 50).
8. The appropriate **Action node** executes:
   - **Score < 50** → sends a "please resubmit" email to the student.
   - **Score ≥ 50** → sends a "congratulations / pass" email.
9. The submission record is updated in Supabase with the final score and status `Completed`.

---

## Step 8 — Teacher: Review Results

1. Open the **Teacher Console** → **Submissions Feed** tab.
2. You will see a live table with:
   - Student name & email
   - Assignment preview (first few lines)
   - Submission time
   - Status (`Completed`, `Processing`, `Failed`, or `No active workflow`)
   - AI Score (0-100)
3. Click the **Refresh** button (↻) to load the latest submissions.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Score is `—` / status is `No active workflow` | No workflow has `status = running` | Go to Builder → re-save the workflow (it auto-sets to running on save) |
| Email not received | `GMAIL_USER`/`GMAIL_PASS` not set or App Password wrong | Check `backend/.env`; ensure App Passwords are enabled in your Google account |
| `Could not extract text` error | Corrupt or image-only PDF | Ask student to use a text-based PDF or paste text manually |
| AI returns non-numeric response | System prompt not strict enough | Edit AI node System Persona to include: "Respond ONLY with a number 0-100." |
| `Student not linked to a teacher` error | Student account was not created through the Teacher Console | Re-create the student via **Manage Students** tab |
| Backend connection refused | Server is not running | Run `npm run dev` in the `fusionflow` root directory |

---

## Quick Reference — Key API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/teacher/signup` | Create teacher account |
| `POST` | `/api/teacher/login` | Teacher login |
| `POST` | `/api/teacher/create-student` | Create a student linked to teacher |
| `POST` | `/api/teacher/generate-key` | Generate/regenerate API key |
| `POST` | `/api/submit` | Student text submission |
| `POST` | `/api/submit-file` | Student file submission |
| `GET` | `/api/submissions?teacherId=X` | Teacher: view all submissions |
| `GET` | `/api/submissions/student/:username` | Student: view own submissions |
| `POST` | `/api/workflows` | Save a workflow |
| `POST` | `/api/workflows/:id/run` | Set workflow to running |
| `PATCH` | `/api/workflows/:id/status` | Toggle running/stopped |

---

## Environment Variables Reference (`backend/.env`)

```env
GROQ_API_KEY=your_groq_key_here          # Required — powers the AI grading node
SUPABASE_URL=https://...supabase.co      # Required — database for users & submissions
SUPABASE_KEY=eyJ...                      # Required — Supabase anon key
GMAIL_USER=you@gmail.com                 # Optional — for real email sending
GMAIL_PASS=xxxx xxxx xxxx xxxx          # Optional — Gmail App Password (16 chars)
PORT=3001                                # Optional — defaults to 3001
```
