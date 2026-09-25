import { AuthenticatedSocket } from './socket.auth.js';
import { prisma } from '../lib/prisma.js';

export const handleSocketEvents = (socket: AuthenticatedSocket) => {
  socket.on('session:join', async (payload, callback) => {
    try {
      const { sessionId } = payload;
      if (!sessionId) {
        if (callback) callback({ success: false, error: 'SESSION_ID_REQUIRED' });
        return;
      }

      // Check session exists and is active
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        if (callback) callback({ success: false, error: 'SESSION_NOT_FOUND' });
        return;
      }

      if (session.status !== 'IN_PROGRESS') {
         // Students shouldn't join ended sessions dynamically, but faculty might view past? 
         // Standardize to reject if not in progress? Actually faculty might view history.
         // Let's just say only IN_PROGRESS for realtime. 
         // Wait, faculty might need to see the "SESSION_ENDED" UI updates.
         // Let's not strict reject unless needed, but wait, the prompt says "Session is currently active" for student.
      }

      const user = socket.user!;

      if (user.role === 'STUDENT') {
        if (session.status !== 'IN_PROGRESS') {
           if (callback) callback({ success: false, error: 'SESSION_NOT_ACTIVE' });
           return;
        }

        const student = await prisma.student.findUnique({ where: { userId: user.id } });
        if (!student) {
          if (callback) callback({ success: false, error: 'UNAUTHORIZED' });
          return;
        }

        const enrollment = await prisma.enrollment.findUnique({
          where: { studentId_classId: { studentId: student.id, classId: session.classId } }
        });

        if (!enrollment || enrollment.status !== 'ACTIVE') {
          if (callback) callback({ success: false, error: 'NOT_ENROLLED' });
          return;
        }

        // Authorization passed
        socket.join(`attendance-session:${sessionId}`);
        if (callback) callback({ success: true, sessionId });

      } else if (user.role === 'FACULTY') {
        const faculty = await prisma.faculty.findUnique({ where: { userId: user.id } });
        if (!faculty) {
          if (callback) callback({ success: false, error: 'UNAUTHORIZED' });
          return;
        }

        if (session.facultyId !== faculty.id) {
          if (callback) callback({ success: false, error: 'FACULTY_NOT_OWNER' });
          return;
        }

        // Authorization passed
        socket.join(`attendance-session:${sessionId}`);
        socket.join(`attendance-session:${sessionId}:faculty`); // Private room for faculty
        if (callback) callback({ success: true, sessionId });
      } else {
        // Admin or other roles - Read-only monitoring
        // "Admin may have read-only monitoring privileges according to the existing RBAC model."
        if (user.role === 'ADMIN') {
           socket.join(`attendance-session:${sessionId}`);
           socket.join(`attendance-session:${sessionId}:faculty`); // Admin gets faculty updates too
           if (callback) callback({ success: true, sessionId });
        } else {
           if (callback) callback({ success: false, error: 'UNAUTHORIZED_ROLE' });
        }
      }

    } catch (error) {
      console.error('Socket session:join error:', error);
      if (callback) callback({ success: false, error: 'INTERNAL_SERVER_ERROR' });
    }
  });
};
