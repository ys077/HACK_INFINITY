import { prisma } from '../lib/prisma.js';
import { EventType, PresenceEvent } from '@prisma/client';

export interface PresenceInterval {
  start: Date;
  end: Date;
  durationSeconds: number;
}

export interface AbsenceInterval {
  start: Date;
  end: Date;
  durationSeconds: number;
  reason: string;
}

export interface TimelineSummary {
  verifiedSeconds: number;
  verifiedMinutes: number;
  absenceSeconds: number;
  attendancePercentage: number;
  joinCount: number;
  rejoinCount: number;
  leaveCount: number;
  timeoutCount: number;
}

export interface StudentTimelineResponse {
  sessionId: string;
  studentId: string;
  events: Array<{ eventType: string; timestamp: Date }>;
  summary: TimelineSummary;
  presenceIntervals: PresenceInterval[];
  absenceIntervals: AbsenceInterval[];
}

export class TimelineService {
  /**
   * Calculates the timeline and intervals from a sequence of events.
   */
  static calculateTimeline(events: PresenceEvent[], sessionStart: Date, sessionEnd: Date): Omit<StudentTimelineResponse, 'sessionId' | 'studentId'> {
    const clamp = (d: Date): Date => {
      let time = d.getTime();
      const min = sessionStart.getTime();
      const max = sessionEnd.getTime();
      if (time < min) time = min;
      if (time > max) time = max;
      return new Date(time);
    };

    let joinCount = 0;
    let rejoinCount = 0;
    let leaveCount = 0;
    let timeoutCount = 0;

    const presenceIntervals: PresenceInterval[] = [];
    const absenceIntervals: AbsenceInterval[] = [];

    let currentPresenceStart: Date | null = null;
    let currentAbsenceStart: Date = clamp(sessionStart);
    let lastAbsenceReason: string = 'NOT_JOINED';

    for (const event of events) {
      if (event.eventType === 'JOINED') joinCount++;
      if (event.eventType === 'REJOINED') rejoinCount++;
      if (event.eventType === 'LEFT') leaveCount++;
      if (event.eventType === 'TIMEOUT') timeoutCount++;

      if (!currentPresenceStart) {
        if (event.eventType === 'JOINED' || event.eventType === 'REJOINED') {
          currentPresenceStart = event.timestamp;
          // Close current absence
          const clampedStart = clamp(currentAbsenceStart);
          const clampedEnd = clamp(event.timestamp);
          if (clampedEnd > clampedStart) {
            absenceIntervals.push({
              start: clampedStart,
              end: clampedEnd,
              durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000),
              reason: lastAbsenceReason
            });
          }
        }
      } else {
        if (event.eventType === 'LEFT' || event.eventType === 'TIMEOUT' || event.eventType === 'SESSION_ENDED') {
          // Close current presence
          const clampedStart = clamp(currentPresenceStart);
          const clampedEnd = clamp(event.timestamp);
          if (clampedEnd > clampedStart) {
            presenceIntervals.push({
              start: clampedStart,
              end: clampedEnd,
              durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000)
            });
          }
          currentPresenceStart = null;
          currentAbsenceStart = event.timestamp;
          lastAbsenceReason = event.eventType;
        }
      }
    }

    // Finalize intervals at sessionEnd
    if (currentPresenceStart) {
      const clampedStart = clamp(currentPresenceStart);
      const clampedEnd = clamp(sessionEnd);
      if (clampedEnd > clampedStart) {
        presenceIntervals.push({
          start: clampedStart,
          end: clampedEnd,
          durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000)
        });
      }
    } else {
      const clampedStart = clamp(currentAbsenceStart);
      const clampedEnd = clamp(sessionEnd);
      if (clampedEnd > clampedStart) {
        absenceIntervals.push({
          start: clampedStart,
          end: clampedEnd,
          durationSeconds: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 1000),
          reason: lastAbsenceReason
        });
      }
    }

    const verifiedSeconds = presenceIntervals.reduce((acc, i) => acc + i.durationSeconds, 0);
    const absenceSeconds = absenceIntervals.reduce((acc, i) => acc + i.durationSeconds, 0);
    const sessionDurationSeconds = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
    const attendancePercentage = sessionDurationSeconds > 0 ? Number(((verifiedSeconds / sessionDurationSeconds) * 100).toFixed(2)) : 0;

    return {
      events: events.map(e => ({ eventType: e.eventType, timestamp: e.timestamp })),
      summary: {
        verifiedSeconds,
        verifiedMinutes: Math.floor(verifiedSeconds / 60),
        absenceSeconds,
        attendancePercentage,
        joinCount,
        rejoinCount,
        leaveCount,
        timeoutCount
      },
      presenceIntervals,
      absenceIntervals
    };
  }

  static async getStudentTimeline(sessionId: string, studentId: string): Promise<StudentTimelineResponse> {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new Error('Session not found');

    const events = await prisma.presenceEvent.findMany({
      where: { sessionId, studentId },
      orderBy: { timestamp: 'asc' }
    });

    const sessionStart = session.startedAt || new Date();
    const sessionEnd = session.status === 'IN_PROGRESS' ? new Date() : (session.endedAt || session.expectedEndAt);

    const timeline = this.calculateTimeline(events, sessionStart, sessionEnd);

    return {
      sessionId,
      studentId,
      ...timeline
    };
  }

  static async getSessionSummary(sessionId: string) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { enrollments: true } } }
    });

    if (!session) throw new Error('Session not found');

    const enrolledStudentIds = session.class.enrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.studentId);

    const allEvents = await prisma.presenceEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });
    
    // Check if finalized attendance records exist, fallback to dynamic calc
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId }
    });

    let totalJoinCount = 0;
    let totalRejoinCount = 0;
    let totalTimeoutCount = 0;
    let totalLeaveCount = 0;
    let totalVerifiedSeconds = 0;
    let sumAttendancePercentage = 0;
    let presentStudents = 0;
    let absentStudents = 0;
    let partialStudents = 0;

    const sessionStart = session.startedAt || new Date();
    const sessionEnd = session.status === 'IN_PROGRESS' ? new Date() : (session.endedAt || session.expectedEndAt);

    for (const studentId of enrolledStudentIds) {
      const studentEvents = allEvents.filter(e => e.studentId === studentId);
      const timeline = this.calculateTimeline(studentEvents, sessionStart, sessionEnd);
      
      totalJoinCount += timeline.summary.joinCount;
      totalRejoinCount += timeline.summary.rejoinCount;
      totalTimeoutCount += timeline.summary.timeoutCount;
      totalLeaveCount += timeline.summary.leaveCount;
      
      let verifiedSeconds = timeline.summary.verifiedSeconds;
      let attendancePercentage = timeline.summary.attendancePercentage;
      let status = 'ABSENT';

      // Use saved record if exists and is final
      const record = attendanceRecords.find(r => r.studentId === studentId);
      if (record) {
        verifiedSeconds = record.totalPresentSeconds;
        attendancePercentage = record.presencePercentage;
        status = record.status;
      } else {
        status = attendancePercentage >= 50 ? 'PRESENT' : 'ABSENT'; // Assume 50% is PRESENT for partial calculation logic
      }

      totalVerifiedSeconds += verifiedSeconds;
      sumAttendancePercentage += attendancePercentage;

      if (status === 'PRESENT') {
        presentStudents++;
      } else {
        absentStudents++;
      }
    }

    const totalStudents = enrolledStudentIds.length;

    return {
      totalStudents,
      presentStudents,
      absentStudents,
      partialStudents, // Logic can be adapted if there's a specific PARTIAL status
      averageVerifiedDuration: totalStudents > 0 ? Math.floor(totalVerifiedSeconds / totalStudents) : 0,
      averageAttendancePercentage: totalStudents > 0 ? Number((sumAttendancePercentage / totalStudents).toFixed(2)) : 0,
      totalJoinEvents: totalJoinCount,
      totalRejoinEvents: totalRejoinCount,
      totalTimeoutEvents: totalTimeoutCount,
      totalLeaveEvents: totalLeaveCount
    };
  }
}
