import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkflowBuilder from './workflow-builder/WorkflowBuilder';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

// Guard: redirect to /login if the given sessionKey is not in sessionStorage
function RequireSession({ sessionKey, children }) {
  if (!sessionStorage.getItem(sessionKey)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Guard for builder: either teacher or student must be logged in
function RequireAnySession({ children }) {
  const loggedIn =
    !!sessionStorage.getItem('teacher_session') ||
    !!sessionStorage.getItem('student');
  if (!loggedIn) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public auth page */}
        <Route path="/login" element={<Login />} />

        {/* Redirect bare root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Teacher Dashboard — protected */}
        <Route
          path="/teacher"
          element={
            <RequireSession sessionKey="teacher_session">
              <TeacherDashboard />
            </RequireSession>
          }
        />

        {/* Student Dashboard — protected */}
        <Route
          path="/student"
          element={
            <RequireSession sessionKey="student">
              <StudentDashboard />
            </RequireSession>
          }
        />

        {/* Workflow Builder — only accessible from within a dashboard session */}
        <Route
          path="/builder/:id?"
          element={
            <RequireAnySession>
              <WorkflowBuilder />
            </RequireAnySession>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
