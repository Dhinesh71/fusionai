# FusionFlow - AI-Powered No-Code Workflow Automation

FusionFlow is a robust, visual automation builder designed for non-technical users (like students and teachers) to seamlessly connect tools and automate academic workflows. Built primarily with an intuitive drag-and-drop interface, FusionFlow allows users to string together triggers, AI agents, logical conditions, and actions into powerful automated pipelines — similar to Zapier or Make, but with deep, native AI integration using the Groq API.

## Core Features

- **Visual Drag-and-Drop Builder**: Build nodes on an interactive canvas using `React Flow`.
- **AI Agent Nodes**: Native integration with the Groq API (`llama3-70b-8192`) for tasks like grading, formatting, analysis, and intent detection.
- **Dynamic Branching Context**: Advanced Condition nodes that evaluate data (e.g., `score > 80`) and split operations logically inside the workflow.
- **Asynchronous Execution Queue**: Scalable background job processing leveraging `BullMQ` and `Redis`.
- **Workflow Logging & Tracking**: Persistent tracking of execution statuses and outputs via mapped schemas designed for `Supabase`.

---

## Tech Stack

### Frontend
- **React.js** (via Vite)
- **React Flow** (Visual Webhook Node builder)
- **TailwindCSS** (Styling & Design System)
- **Lucide-React** (UI Icons)

### Backend
- **Node.js + Express.js** (Core API & Webhooks)
- **BullMQ + Redis** (Job Queuing logic)
- **AI Engine:** Groq SDK (Llama 3.3 70B for grading)
- **Supabase / PostgreSQL** (Mockable execution tracking system)

---

## Architecture Overview

### 1. Workflow Engine (`backend/workflow-engine/index.js`)
Responsible for reading the JSON graph from the frontend React Flow. The engine identifies the `Trigger` node, evaluates the initial payload, cascades variables systematically through `Action`, `AI`, and `Condition` nodes by resolving template syntax like `{{input.assignment}}`.

### 2. Node Executors (`backend/node-executors/index.js`)
Contains logic to parse dynamic string templates and trigger respective APIs conditionally.

### 3. Queue System (`backend/queues/index.js`)
Handles the background orchestration of node events, keeping heavy LLM operations running completely detached from front-facing endpoints.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Local or Remote Redis instance (Default port 6379)
- (Optional but Reccomended) Supabase Database Key
- (Optional but Reccomended) Groq API Key

### Installation

1. **Clone the project / navigate to the main directory:**
   ```bash
   cd fusionflow
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up Environment Variables:**
   Create a `.env` file inside the `backend/` directory:
   ```env
   # Backend Queue Server
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379

   # AI Capability
   GROQ_API_KEY=your_groq_api_key

   # Database Logging Capability
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   
   # Gmail Automation
   GMAIL_USER=your_email@gmail.com
   GMAIL_PASS=your_16_char_app_password
   ```
   
   **How to get a Google App Password (`GMAIL_PASS`):**
   1. Go to your [Google Account Security](https://myaccount.google.com/security) page.
   2. Ensure **2-Step Verification** is turned ON.
   3. Search for **"App Passwords"** in the top search bar (or find it under 2-Step Verification).
   4. Create a new App Password named `FusionFlow`.
   5. Google will provide a **16-character code**. Copy this code and paste it into `GMAIL_PASS` inside your `.env` file. Do not include spaces.

   *Note: Providing no `.env` file will default the system into mocked responses for AI, database, and email operations.*

### Running the App Locally

Execute both servers simultaneously from the root `fusionflow` directory:
```bash
npm start
```

- **Frontend Builder**: Runs on `http://localhost:5173`
- **Backend Express Server**: Runs on `http://localhost:3001`

---

## Demonstration
Navigate to the Workflow Builder on the Dashboard by clicking the **"New Workflow"** tab. Click the **"Assignment Evaluation"** template on the side to view an example structural setup connecting WebHooks, AI verification models, branching condition tests, and email action nodes.

---

## 📽️ Jury Interaction & Demo Script

Use this script to present **FusionFlow** effectively during a jury or project review. This walkthrough highlights the technical depth and user-centric design of the platform.

### 1. The Hook (Problem & Vision)
- **Start with:** "In modern education, feedback is everything, but teachers are overwhelmed by manual tasks. Grading 100 assignments takes days. **FusionFlow** is a no-code automation engine that lets teachers build their own AI-powered grading logic in minutes without writing a single line of code."

### 2. The Demonstration Walkthrough

#### Step A: Teacher Setup (The "Brain" Creation)
1. **Login:** "I’ll start as a **Teacher**. I login to my console and go to the **API Key** tab. This key is the secure bridge between my dashboard and the automation builder."
2. **The Builder:** "Now, let’s build the logic. I’ll go to the **Workflow Builder**. I’ll grab the **Assignment Evaluator** template."
3. **The Configuration:** "Notice the **Trigger** node. I’ll link my API key here. Next, look at the **AI Agent** node. I’ve configured it to use **Llama 3.3 70B** to grade based on a specific rubric."
4. **The Logic (The Core Innovation):** "Here is the magic: the **Condition** node. If the AI gives a score below 50, it triggers a 'Request Rewrite' email. If it's above 50, it sends a 'Pass' notification. I’ll hit **Deploy Workflow** and it's now live."

#### Step B: Student Execution (The Live Test)
1. **Login:** "Now, let's switch to a **Student**. I'll login with credentials my teacher gave me."
2. **Upload:** "I have a complex 2-page PDF assignment about Environmental Science. I'll drag and drop it here."
3. **Live Processing:** "The moment I hit 'Submit', the backend triggers the **FusionFlow Engine**. It extracts the PDF text, sends it to the Groq AI model, evaluates the logic, and saves the result."
4. **The Result:** "Within seconds, the student sees their score (e.g., **89/100**) and the status changes to **Completed**."

#### Step C: Teacher Verification
1. **The Feed:** "Back in the **Teacher Console**, I can see the live feed. The student's work, the AI’s score, and the exact time it was graded are all tracked here automatically."

### 3. The Technical Deep Dive (Key Talking Points)
- **Groq AI Integration:** "We aren't just calling an API; we are using high-performance inference (Groq) to get near-instant grading responses, making the 'Live' experience possible."
- **No-Code Engine:** "The most complex part is our **custom execution engine**. It parses the React Flow graph (Nodes and Edges) and cascades data through variables (like `{{node_2.output}}`) just like professional tools like Zapier."
- **Persistence:** "Everything is backed by **Supabase/PostgreSQL**, ensuring that even if a student closes their tab, their grade is safely stored for the teacher."

### 4. Conclusion
- **End with:** "FusionFlow isn't just a grader; it's a productivity platform that puts the power of AI automation into the hands of educators. We’ve turned a 3-day grading cycle into a 3-second automated workflow."

---
**Developed for 6ixminds Labs.**
