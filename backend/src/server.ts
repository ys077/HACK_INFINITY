import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.routes.js';
import adminStudentRoutes from './routes/admin.student.routes.js';
import adminFacultyRoutes from './routes/admin.faculty.routes.js';
import adminAcademicRoutes from './routes/admin.academic.routes.js';
import adminClassRoutes from './routes/admin.class.routes.js';
import adminSessionRoutes from './routes/admin.session.routes.js';
import studentRoutes from './routes/student.routes.js';
import studentClassRoutes from './routes/student.class.routes.js';
import studentSessionRoutes from './routes/student.session.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import facultyClassRoutes from './routes/faculty.class.routes.js';
import facultySessionRoutes from './routes/faculty.session.routes.js';
import presenceRoutes from './routes/presence.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import timelineRoutes from './routes/timeline.routes.js';
import conflictRoutes from './routes/conflict.routes.js';
import deviceRoutes from './routes/device.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();
const server = http.createServer(app);

import { initSocketServer } from './sockets/socket.server.js';

// Initialize Socket.IO
initSocketServer(server);

import { globalLimiter } from './middleware/rate-limit.middleware.js';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet());
app.use(globalLimiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/students', adminStudentRoutes);
app.use('/api/admin/faculty', adminFacultyRoutes);
app.use('/api/admin', adminAcademicRoutes);
app.use('/api/admin/classes', adminClassRoutes);
app.use('/api/admin/sessions', adminSessionRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/student/classes', studentClassRoutes);
app.use('/api/student/sessions', studentSessionRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/faculty/classes', facultyClassRoutes);
app.use('/api/faculty/sessions', facultySessionRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', timelineRoutes);
app.use('/api', conflictRoutes);
app.use('/api', deviceRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', auditRoutes);


// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

export { app, server };

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
