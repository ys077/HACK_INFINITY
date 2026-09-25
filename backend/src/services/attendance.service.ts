import { prisma } from '../lib/prisma.js';
import { EventType, AttendanceStatus, AttendanceSession, PresenceEvent } from '@prisma/client';

export interface PresenceInterval {
  start: Date;
  end: Date;
  durationSeconds: number;
}

export interface StudentAttendanceResult {
  studentId: string;
  name: string;
  status: AttendanceStatus;
  verifiedSeconds: number;
  attendancePercentage: number;
  intervals: PresenceInterval[];
}

export class AttendanceService {
  /**
   * Calculate intervals and total duration from a raw sequence of events.
   */
  static calculateIntervals(events: PresenceEvent[], sessionStart: Date, sessionEnd: Date): PresenceInterval[] {
    const intervals: PresenceInterval[] = [];
    let currentStart: Date | null = null;

    const clamp = (d: Date): Date => {
      let time = d.getTime();
      const min = sessionStart.getTime();
      const max = sessionEnd.getTime();
      if (time < min) time = min;
      if (time > max) time = max;
      return new Date(time);
    };

    for (const event of events) {
      if (!currentStart) {
        if (event.eventType === 'JOINED' || event.eventType === 'REJOINED') {
          currentStart = event.timestamp;
        }
      } else {
        if (event.eventType === 'LEFT' || event.eventType === 'TIMEOUT' || event.eventType === 'SESSION_ENDED') {
          const clampedStart = clamp(currentStart);
          const clampedEnd = clamp(event.timestamp);

          if (clampedEnd > clampedStart) {
            intervals.push({
              start: clampedStart,
              end: clampedEnd,
              durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000)
            });
          }
          currentStart = null;
        }
      }
    }

    // If the student is still "PRESENT" when the loop finishes, clamp to sessionEnd
    if (currentStart) {
      const clampedStart = clamp(currentStart);
      const clampedEnd = clamp(sessionEnd);
      if (clampedEnd > clampedStart) {
        intervals.push({
          start: clampedStart,
          end: clampedEnd,
          durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000)
        });
      }
    }

    return intervals;
  }

  /**
   * Calculates the attendance for a single student in a session.
   */
  static async calculateStudentAttendance(sessionId: string, studentId: string): Promise<StudentAttendanceResult> {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('Student not found');

    const events = await prisma.presenceEvent.findMany({
      where: { sessionId, studentId },
      orderBy: { timestamp: 'asc' }
    });

    const sessionStart = session.startedAt || new Date();
    // If the session is still active, use 'now' as the max bound for calculation.
    const sessionEnd = session.status === 'IN_PROGRESS' ? new Date() : (session.endedAt || session.expectedEndAt);

    const intervals = this.calculateIntervals(events, sessionStart, sessionEnd);
    const verifiedSeconds = intervals.reduce((acc, interval) => acc + interval.durationSeconds, 0);
    
    const sessionDurationSeconds = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
    const percentage = sessionDurationSeconds > 0 ? (verifiedSeconds / sessionDurationSeconds) * 100 : 0;
    
    const status: AttendanceStatus = percentage >= 75 ? 'PRESENT' : percentage >= 25 ? 'PARTIAL' : 'ABSENT';

    return {
      studentId,
      name: student.name,
      status,
      verifiedSeconds,
      attendancePercentage: Number(percentage.toFixed(2)),
      intervals
    };
  }

  /**
   * Calculate and finalize attendance for the entire session.
   * Creates/Updates AttendanceRecord for all enrolled students.
   */
  static async finalizeSessionAttendance(sessionId: string): Promise<void> {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { enrollments: true } } }
    });

    if (!session) throw new Error('Session not found');

    const enrolledStudentIds = session.class.enrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.studentId);

    // Fetch all events for the session
    const allEvents = await prisma.presenceEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });

    const sessionStart = session.startedAt || new Date();
    const sessionEnd = session.endedAt || session.expectedEndAt;
    const sessionDurationSeconds = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);

    await prisma.$transaction(async (tx) => {
      for (const studentId of enrolledStudentIds) {
        const studentEvents = allEvents.filter(e => e.studentId === studentId);
        const intervals = this.calculateIntervals(studentEvents, sessionStart, sessionEnd);
        
        const verifiedSeconds = intervals.reduce((acc, interval) => acc + interval.durationSeconds, 0);
        const absentSeconds = sessionDurationSeconds - verifiedSeconds;
        const percentage = sessionDurationSeconds > 0 ? (verifiedSeconds / sessionDurationSeconds) * 100 : 0;
        const status: AttendanceStatus = percentage >= 75 ? 'PRESENT' : percentage >= 25 ? 'PARTIAL' : 'ABSENT';

        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId } },
          create: {
            sessionId,
            studentId,
            totalPresentSeconds: verifiedSeconds,
            totalAbsentSeconds: Math.max(0, absentSeconds),
            presencePercentage: percentage,
            status
          },
          update: {
            totalPresentSeconds: verifiedSeconds,
            totalAbsentSeconds: Math.max(0, absentSeconds),
            presencePercentage: percentage,
            status,
            calculatedAt: new Date()
          }
        });
      }
    });
  }
}
