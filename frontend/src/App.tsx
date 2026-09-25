import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import StudentLayout from './layouts/StudentLayout';
import FacultyLayout from './layouts/FacultyLayout';
import AdminLayout from './layouts/AdminLayout';

// Common
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetails from './pages/student/StudentClassDetails';
import StudentLiveSession from './pages/student/StudentLiveSession';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentProfile from './pages/student/StudentProfile';
import StudentDevice from './pages/student/StudentDevice';
import StudentTimeline from './pages/student/StudentTimeline';
import StudentAttendanceDetails from './pages/student/StudentAttendanceDetails';
import BluetoothTest from './pages/student/BluetoothTest';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyClasses from './pages/faculty/FacultyClasses';
import FacultyClassDetails from './pages/faculty/FacultyClassDetails';
import FacultyStartSession from './pages/faculty/FacultyStartSession';
import FacultyLiveSession from './pages/faculty/FacultyLiveSession';
import FacultyStudents from './pages/faculty/FacultyStudents';
import FacultyStudentPresence from './pages/faculty/FacultyStudentPresence';
import FacultyConflicts from './pages/faculty/FacultyConflicts';
import FacultyAttendanceHistory from './pages/faculty/FacultyAttendanceHistory';
import FacultyClassAnalytics from './pages/faculty/FacultyClassAnalytics';
import FacultyReports from './pages/faculty/FacultyReports';

import './App.css';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role: 'STUDENT' | 'FACULTY' | 'ADMIN' }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="classes" element={<StudentClasses />} />
            <Route path="classes/:id" element={<StudentClassDetails />} />
            <Route path="sessions" element={<StudentLiveSession />} />
            <Route path="sessions/:id" element={<StudentLiveSession />} />
            <Route path="sessions/:id/timeline" element={<StudentTimeline />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="attendance/:id" element={<StudentAttendanceDetails />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="device" element={<StudentDevice />} />
            <Route path="bluetooth-test" element={<BluetoothTest />} />
          </Route>

          {/* Faculty Routes */}
          <Route path="/faculty" element={<ProtectedRoute role="FACULTY"><FacultyLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="classes" element={<FacultyClasses />} />
            <Route path="classes/:id" element={<FacultyClassDetails />} />
            <Route path="sessions/start" element={<FacultyStartSession />} />
            <Route path="sessions/:id" element={<FacultyLiveSession />} />
            <Route path="sessions/:id/students" element={<FacultyStudents />} />
            <Route path="sessions/:id/presence" element={<FacultyStudentPresence />} />
            <Route path="conflicts" element={<FacultyConflicts />} />
            <Route path="attendance/history" element={<FacultyAttendanceHistory />} />
            <Route path="analytics" element={<FacultyClassAnalytics />} />
            <Route path="reports" element={<FacultyReports />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
