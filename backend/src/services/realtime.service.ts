import { Server } from 'socket.io';

let io: Server | null = null;

export class RealtimeService {
  /**
   * Initialize the RealtimeService with the Socket.IO server instance.
   */
  static initialize(socketIoServer: Server) {
    io = socketIoServer;
  }

  static getIO(): Server {
    if (!io) {
      throw new Error('RealtimeService has not been initialized with a Socket.IO server');
    }
    return io;
  }

  private static getRoomName(sessionId: string): string {
    return `attendance-session:${sessionId}`;
  }

  /**
   * Broadcast that a student joined the session
   */
  static broadcastStudentJoined(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:joined', data);
  }

  /**
   * Broadcast that a student heartbeat was processed
   */
  static broadcastStudentHeartbeat(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:heartbeat', data);
  }

  /**
   * Broadcast that a student left the session
   */
  static broadcastStudentLeft(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:left', data);
  }

  /**
   * Broadcast that a student rejoined the session
   */
  static broadcastStudentRejoined(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:rejoined', data);
  }

  /**
   * Broadcast that a student timed out
   */
  static broadcastStudentTimeout(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:timeout', data);
  }

  /**
   * Broadcast that a student's state is SESSION_ENDED
   */
  static broadcastStudentSessionEnded(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('student:session-ended', data);
  }

  /**
   * Broadcast that the session has started
   */
  static broadcastSessionStarted(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('session:started', data);
  }

  /**
   * Broadcast that the session has ended
   */
  static broadcastSessionEnded(sessionId: string, data: any) {
    if (!io) return;
    io.to(this.getRoomName(sessionId)).emit('session:ended', data);
  }

  /**
   * Broadcast that a student conflict was detected (for faculty only)
   */
  static broadcastStudentConflict(sessionId: string, data: any) {
    if (!io) return;
    // According to instructions: "emit 'student:conflict' to the authorized session room.
    // Do not broadcast sensitive investigation evidence to every client... do not expose faculty-only details to students."
    // In socket.auth.ts, maybe faculty are in a different room? The instruction says: "emit 'student:conflict' to the authorized session room... Do not broadcast sensitive investigation evidence to every client if it is not necessary. In particular, do not expose faculty-only conflict details to students."
    // The current room is `attendance-session:${sessionId}` which both students and faculty join.
    // So we can broadcast to `attendance-session:${sessionId}:faculty`
    io.to(`attendance-session:${sessionId}:faculty`).emit('student:conflict', data);
  }
}
