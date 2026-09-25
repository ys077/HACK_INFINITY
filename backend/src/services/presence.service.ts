import { prisma } from '../lib/prisma.js';
import { EventType } from '@prisma/client';
import { RealtimeService } from './realtime.service.js';
import { AuditService } from './audit.service.js';

export type PresenceStatus = 'PRESENT' | 'ABSENT' | 'TEMPORARILY_DISCONNECTED' | 'TIMEOUT' | 'SESSION_ENDED';

export interface PresenceState {
  status: PresenceStatus;
  lastEvent: EventType | null;
  lastVerifiedAt: Date | null;
  joinedAt: Date | null;
}

const HEARTBEAT_TIMEOUT_SECONDS = parseInt(process.env.PRESENCE_HEARTBEAT_TIMEOUT_SECONDS || '30', 10);
const GRACE_PERIOD_SECONDS = parseInt(process.env.PRESENCE_GRACE_PERIOD_SECONDS || '120', 10);

export class PresenceService {
  /**
   * Retrieves the current presence state for a student in a session,
   * lazily evaluating timeouts and recording them if necessary.
   */
  static async getStudentState(sessionId: string, studentId: string): Promise<PresenceState> {
    const events = await prisma.presenceEvent.findMany({
      where: { sessionId, studentId },
      orderBy: { timestamp: 'desc' }
    });

    if (events.length === 0) {
      return { status: 'ABSENT', lastEvent: null, lastVerifiedAt: null, joinedAt: null };
    }

    const latest = events[0];
    const joinedEvent = events.slice().reverse().find(e => e.eventType === 'JOINED');
    const joinedAt = joinedEvent ? joinedEvent.timestamp : null;

    if (latest.eventType === 'LEFT') {
      return { status: 'ABSENT', lastEvent: 'LEFT', lastVerifiedAt: latest.timestamp, joinedAt };
    }
    if (latest.eventType === 'TIMEOUT') {
      return { status: 'TIMEOUT', lastEvent: 'TIMEOUT', lastVerifiedAt: latest.timestamp, joinedAt };
    }
    if (latest.eventType === 'SESSION_ENDED') {
      return { status: 'SESSION_ENDED', lastEvent: 'SESSION_ENDED', lastVerifiedAt: latest.timestamp, joinedAt };
    }

    // Latest is JOINED, HEARTBEAT, or REJOINED
    const now = new Date();
    const diffSeconds = (now.getTime() - latest.timestamp.getTime()) / 1000;

    if (diffSeconds > GRACE_PERIOD_SECONDS) {
      // Lazy timeout insertion
      const timeoutEvent = await prisma.presenceEvent.create({
        data: {
          sessionId,
          studentId,
          eventType: 'TIMEOUT',
          timestamp: new Date(latest.timestamp.getTime() + (GRACE_PERIOD_SECONDS * 1000))
        }
      });
      RealtimeService.broadcastStudentTimeout(sessionId, {
        sessionId,
        studentId,
        eventType: 'TIMEOUT',
        timestamp: timeoutEvent.timestamp
      });
      
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      await AuditService.createAuditLog({
        actorId: student?.userId,
        action: 'PRESENCE_TIMEOUT',
        entityType: 'AttendanceSession',
        entityId: sessionId,
        metadata: { studentId: studentId, method: 'AUTO' }
      });
      
      return { status: 'TIMEOUT', lastEvent: 'TIMEOUT', lastVerifiedAt: timeoutEvent.timestamp, joinedAt };
    }

    if (diffSeconds > HEARTBEAT_TIMEOUT_SECONDS) {
      return { status: 'TEMPORARILY_DISCONNECTED', lastEvent: latest.eventType, lastVerifiedAt: latest.timestamp, joinedAt };
    }

    return { status: 'PRESENT', lastEvent: latest.eventType, lastVerifiedAt: latest.timestamp, joinedAt };
  }

  static async join(sessionId: string, studentId: string, deviceId: string): Promise<PresenceState> {
    // Validate session
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'IN_PROGRESS') throw new Error('Session is not active');

    // Validate enrollment
    const enrollment = await prisma.enrollment.findUnique({ where: { studentId_classId: { studentId, classId: session.classId } } });
    if (!enrollment || enrollment.status !== 'ACTIVE') throw new Error('Student not actively enrolled');

    const currentState = await this.getStudentState(sessionId, studentId);
    if (currentState.status === 'PRESENT' || currentState.status === 'TEMPORARILY_DISCONNECTED') {
      // Already actively present
      return currentState;
    }

    // Must be ABSENT or TIMEOUT to join
    const newEvent = await prisma.presenceEvent.create({
      data: {
        sessionId,
        studentId,
        deviceId,
        eventType: 'JOINED'
      }
    });

    const state = await this.getStudentState(sessionId, studentId);
    
    // Broadcast
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    RealtimeService.broadcastStudentJoined(sessionId, {
      sessionId,
      studentId,
      studentName: student?.name,
      eventType: 'JOINED',
      timestamp: newEvent.timestamp
    });

    return state;
  }

  static async heartbeat(sessionId: string, studentId: string): Promise<PresenceState> {
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'IN_PROGRESS') throw new Error('Session is not active');

    const currentState = await this.getStudentState(sessionId, studentId);
    if (currentState.status === 'ABSENT' || currentState.status === 'SESSION_ENDED') {
      throw new Error('Cannot heartbeat: Not actively present');
    }

    // If TIMEOUT, ideally they should REJOIN, but let's see. The prompt says "ABSENT -> HEARTBEAT is Invalid", and TIMEOUT becomes ABSENT state.
    if (currentState.status === 'TIMEOUT') {
      throw new Error('Cannot heartbeat: Timed out. Must rejoin.');
    }

    const newEvent = await prisma.presenceEvent.create({
      data: {
        sessionId,
        studentId,
        eventType: 'HEARTBEAT'
      }
    });

    RealtimeService.broadcastStudentHeartbeat(sessionId, {
      sessionId,
      studentId,
      eventType: 'HEARTBEAT',
      timestamp: newEvent.timestamp
    });

    return await this.getStudentState(sessionId, studentId);
  }

  static async leave(sessionId: string, studentId: string): Promise<PresenceState> {
    const currentState = await this.getStudentState(sessionId, studentId);
    
    // Can only leave if currently present in some form
    if (currentState.status === 'ABSENT' || currentState.status === 'SESSION_ENDED' || currentState.status === 'TIMEOUT') {
      throw new Error('Cannot leave: Not actively present');
    }

    const newEvent = await prisma.presenceEvent.create({
      data: {
        sessionId,
        studentId,
        eventType: 'LEFT'
      }
    });

    RealtimeService.broadcastStudentLeft(sessionId, {
      sessionId,
      studentId,
      eventType: 'LEFT',
      timestamp: newEvent.timestamp
    });

    return await this.getStudentState(sessionId, studentId);
  }

  static async rejoin(sessionId: string, studentId: string, deviceId: string): Promise<PresenceState> {
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'IN_PROGRESS') throw new Error('Session is not active');

    const currentState = await this.getStudentState(sessionId, studentId);
    
    // Check if they were previously in the session (must have a joinedAt)
    if (!currentState.joinedAt) {
      throw new Error('Cannot rejoin: Never joined this session. Use join instead.');
    }

    if (currentState.status === 'PRESENT' || currentState.status === 'TEMPORARILY_DISCONNECTED') {
       return currentState; // already present
    }

    const newEvent = await prisma.presenceEvent.create({
      data: {
        sessionId,
        studentId,
        deviceId,
        eventType: 'REJOINED'
      }
    });

    RealtimeService.broadcastStudentRejoined(sessionId, {
      sessionId,
      studentId,
      eventType: 'REJOINED',
      timestamp: newEvent.timestamp
    });

    return await this.getStudentState(sessionId, studentId);
  }

  /**
   * Called when a session ends to close out any active presence states.
   */
  static async handleSessionEnd(sessionId: string): Promise<void> {
    const events = await prisma.presenceEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' }
    });

    // Group by student
    const studentLatest = new Map<string, typeof events[0]>();
    for (const e of events) {
      if (!studentLatest.has(e.studentId)) {
        studentLatest.set(e.studentId, e);
      }
    }

    const now = new Date();
    for (const [studentId, latest] of studentLatest.entries()) {
      if (['JOINED', 'HEARTBEAT', 'REJOINED'].includes(latest.eventType)) {
        // They were active when session ended
        const newEvent = await prisma.presenceEvent.create({
          data: {
            sessionId,
            studentId,
            eventType: 'SESSION_ENDED',
            timestamp: now
          }
        });
        
        RealtimeService.broadcastStudentSessionEnded(sessionId, {
          sessionId,
          studentId,
          eventType: 'SESSION_ENDED',
          timestamp: newEvent.timestamp
        });
      }
    }
  }
}
