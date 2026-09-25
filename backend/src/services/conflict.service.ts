import { prisma } from '../lib/prisma.js';
import { AttendanceConflict, ConflictType, ConflictSeverity, PresenceEvent, AttendanceSession, AttendanceRecord, Enrollment } from '@prisma/client';
import { TimelineService } from './timeline.service.js';
import { RealtimeService } from './realtime.service.js';
import { AuditService } from './audit.service.js';

interface ConflictEvidence {
  anomaly: string;
  eventId?: string;
  eventTimestamp?: Date;
  sessionStartedAt?: Date | null;
  sessionEndedAt?: Date | null;
  reason: string;
}

export class ConflictService {
  /**
   * Idempotent conflict creation.
   */
  static async createConflict(
    sessionId: string,
    studentId: string,
    type: ConflictType,
    severity: ConflictSeverity,
    evidence: ConflictEvidence
  ): Promise<AttendanceConflict | null> {
    const descriptionStr = JSON.stringify(evidence);

    // Idempotency check: Look for an existing conflict for this student/session with the same anomaly and eventId
    const existingConflicts = await prisma.attendanceConflict.findMany({
      where: { sessionId, studentId, type }
    });

    const isDuplicate = existingConflicts.some(c => {
      try {
        const parsed = JSON.parse(c.description) as ConflictEvidence;
        return parsed.anomaly === evidence.anomaly && parsed.eventId === evidence.eventId;
      } catch {
        return c.description === descriptionStr;
      }
    });

    if (isDuplicate) {
      return null; // Already detected
    }

    const conflict = await prisma.attendanceConflict.create({
      data: {
        sessionId,
        studentId,
        type,
        severity,
        description: descriptionStr
      }
    });

    // Broadcast conflict to authorized faculty via Socket.IO
    RealtimeService.broadcastStudentConflict(sessionId, {
      sessionId,
      studentId,
      conflictType: evidence.anomaly, // Use the specific anomaly as the type for frontend
      timestamp: new Date()
    });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    await AuditService.createAuditLog({
      actorId: student?.userId,
      action: 'CONFLICT_DETECTED',
      entityType: 'AttendanceConflict',
      entityId: conflict.id,
      metadata: { sessionId, studentId, type, severity, anomaly: evidence.anomaly }
    });

    return conflict;
  }

  /**
   * Scan a single student's timeline for conflicts.
   */
  static async detectStudentConflicts(sessionId: string, studentId: string, session: AttendanceSession, record: AttendanceRecord | null, isEnrolled: boolean) {
    const events = await prisma.presenceEvent.findMany({
      where: { sessionId, studentId },
      orderBy: { timestamp: 'asc' }
    });

    const timeline = TimelineService.calculateTimeline(
      events,
      session.startedAt || new Date(),
      session.endedAt || session.expectedEndAt
    );

    // 1. Enrollment consistency
    if (!isEnrolled && events.length > 0) {
      await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'HIGH', {
        anomaly: 'NOT_ENROLLED',
        reason: 'Student has presence events but is not enrolled in the class.'
      });
    }

    let activePresence = false;
    let lastEvent: PresenceEvent | null = null;

    for (const event of events) {
      // 2. Event before session start
      if (session.startedAt && event.timestamp < session.startedAt) {
        await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'MEDIUM', {
          anomaly: 'EVENT_BEFORE_SESSION_START',
          eventId: event.id,
          eventTimestamp: event.timestamp,
          sessionStartedAt: session.startedAt,
          reason: 'Presence event occurred before the attendance session started.'
        });
      }

      // 3. Event after session end
      if (session.endedAt && event.timestamp > session.endedAt) {
        await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'MEDIUM', {
          anomaly: 'EVENT_AFTER_SESSION_END',
          eventId: event.id,
          eventTimestamp: event.timestamp,
          sessionEndedAt: session.endedAt,
          reason: 'Presence event occurred after the attendance session ended.'
        });
      }

      // 4. Invalid state transition & Duplicate active presence
      if (event.eventType === 'JOINED' || event.eventType === 'REJOINED') {
        if (activePresence) {
          await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'HIGH', {
            anomaly: 'INVALID_STATE_TRANSITION',
            eventId: event.id,
            reason: `Duplicate active presence: Received ${event.eventType} while already active.`
          });
        }
        activePresence = true;
      } else if (event.eventType === 'LEFT' || event.eventType === 'TIMEOUT' || event.eventType === 'SESSION_ENDED') {
        if (!activePresence && event.eventType !== 'SESSION_ENDED') {
          await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'HIGH', {
            anomaly: 'INVALID_STATE_TRANSITION',
            eventId: event.id,
            reason: `Invalid state transition: Received ${event.eventType} while not actively present.`
          });
        }
        activePresence = false;
      }

      lastEvent = event;
    }

    // 5. Overlapping presence intervals
    // (TimelineService already clamps and flattens, but we can detect if raw events implies overlaps.
    // The duplicate active presence check above already covers this logically).

    // 6. Attendance record mismatch
    if (record) {
      if (record.totalPresentSeconds !== timeline.summary.verifiedSeconds) {
        await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'MEDIUM', {
          anomaly: 'ATTENDANCE_RECORD_MISMATCH',
          reason: `AttendanceRecord verified seconds (${record.totalPresentSeconds}) does not match computed timeline (${timeline.summary.verifiedSeconds}).`
        });
      }

      // 7. Attendance status mismatch
      if (timeline.summary.verifiedSeconds === 0 && record.status === 'PRESENT') {
        await this.createConflict(sessionId, studentId, 'UNUSUAL_PATTERN', 'MEDIUM', {
          anomaly: 'ATTENDANCE_STATUS_MISMATCH',
          reason: 'AttendanceRecord is PRESENT but timeline verified seconds is 0.'
        });
      }
    }
  }

  /**
   * Scan the entire session for conflicts.
   */
  static async detectSessionConflicts(sessionId: string) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { enrollments: true } } }
    });

    if (!session) throw new Error('Session not found');

    // Session consistency
    if (session.startedAt && session.endedAt && session.endedAt < session.startedAt) {
      // Create a conflict tied to a dummy student? No, conflict requires studentId.
      // So we can only log student-level conflicts.
    }

    const studentsWithEvents = await prisma.presenceEvent.findMany({
      where: { sessionId },
      select: { studentId: true },
      distinct: ['studentId']
    });

    const enrolledIds = new Set(session.class.enrollments.map(e => e.studentId));
    const studentsToAnalyze = new Set([...enrolledIds, ...studentsWithEvents.map(e => e.studentId)]);

    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId }
    });

    for (const studentId of studentsToAnalyze) {
      const record = records.find(r => r.studentId === studentId) || null;
      await this.detectStudentConflicts(sessionId, studentId, session, record, enrolledIds.has(studentId));
    }
  }
}
