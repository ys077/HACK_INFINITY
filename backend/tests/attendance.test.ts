import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Continuous Attendance Duration Module Tests', () => {
  let facultyToken: string;
  let student1Token: string;
  let student2Token: string; // Not enrolled

  let facultyId: string;
  let student1Id: string;
  let student2Id: string;
  let targetClassId: string;
  let sessionId: string;
  let sessionStart: Date;
  let sessionEnd: Date;

  beforeAll(async () => {
    const resFaculty = await request(app).post('/api/auth/login').send({ email: 'john.smith@presenza.edu', password: 'password123' });
    facultyToken = resFaculty.body.data.accessToken;

    const resStudent1 = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    student1Token = resStudent1.body.data.accessToken;

    const resStudent2 = await request(app).post('/api/auth/login').send({ email: 'student2@presenza.edu', password: 'password123' });
    student2Token = resStudent2.body.data.accessToken;

    const faculty = await prisma.faculty.findFirst({ where: { user: { email: 'john.smith@presenza.edu' } } });
    facultyId = faculty!.id;

    const student1 = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });
    student1Id = student1!.id;

    const student2 = await prisma.student.findFirst({ where: { user: { email: 'student2@presenza.edu' } } });
    student2Id = student2!.id;

    await prisma.attendanceRecord.deleteMany({});
    await prisma.presenceEvent.deleteMany({});
    await prisma.attendanceSession.deleteMany({});

    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.findFirst();
    const classroom = await prisma.classroom.findFirst();

    const cls = await prisma.class.create({
      data: {
        subjectId: subject!.id,
        sectionId: section!.id,
        facultyId,
        classroomId: classroom!.id
      }
    });
    targetClassId = cls.id;

    await prisma.enrollment.create({
      data: { classId: targetClassId, studentId: student1Id, status: 'ACTIVE' }
    });
    await prisma.enrollment.create({
      data: { classId: targetClassId, studentId: student2Id, status: 'ACTIVE' }
    });

    sessionStart = new Date('2025-01-01T10:00:00Z');
    sessionEnd = new Date('2025-01-01T11:00:00Z');

    const session = await prisma.attendanceSession.create({
      data: {
        classId: targetClassId,
        facultyId,
        startedAt: sessionStart,
        expectedEndAt: sessionEnd,
        endedAt: sessionEnd,
        status: 'ENDED'
      }
    });
    sessionId = session.id;

    // --- SEED EVENTS FOR STUDENT 1 ---
    // 10:02 JOIN
    // 10:25 TIMEOUT
    // 10:34 REJOIN
    // 10:52 LEAVE
    // 10:56 REJOIN
    // 11:00 SESSION_ENDED
    // Expected:
    // 10:02 -> 10:25 = 23 mins (1380 sec)
    // 10:34 -> 10:52 = 18 mins (1080 sec)
    // 10:56 -> 11:00 = 4 mins (240 sec)
    // Total = 45 mins (2700 sec)
    // Percentage = (2700 / 3600) * 100 = 75% -> PRESENT
    
    await prisma.presenceEvent.createMany({
      data: [
        { sessionId, studentId: student1Id, eventType: 'JOINED', timestamp: new Date('2025-01-01T10:02:00Z') },
        // Add a heartbeat that shouldn't affect intervals
        { sessionId, studentId: student1Id, eventType: 'HEARTBEAT', timestamp: new Date('2025-01-01T10:15:00Z') },
        { sessionId, studentId: student1Id, eventType: 'TIMEOUT', timestamp: new Date('2025-01-01T10:25:00Z') },
        { sessionId, studentId: student1Id, eventType: 'REJOINED', timestamp: new Date('2025-01-01T10:34:00Z') },
        { sessionId, studentId: student1Id, eventType: 'LEFT', timestamp: new Date('2025-01-01T10:52:00Z') },
        { sessionId, studentId: student1Id, eventType: 'REJOINED', timestamp: new Date('2025-01-01T10:56:00Z') },
        { sessionId, studentId: student1Id, eventType: 'SESSION_ENDED', timestamp: new Date('2025-01-01T11:00:00Z') }
      ]
    });

    // Student 2 has no events -> 0 seconds, ABSENT.
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Attendance Calculation Service & API', () => {
    it('Faculty can view session attendance and it calculates correctly', async () => {
      const res = await request(app).get(`/api/faculty/sessions/${sessionId}/attendance`).set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.students).toHaveLength(2);

      const s1 = res.body.data.students.find((s: any) => s.studentId === student1Id);
      expect(s1.verifiedSeconds).toBe(2700);
      expect(s1.attendancePercentage).toBe(75);
      expect(s1.status).toBe('PRESENT');

      const s2 = res.body.data.students.find((s: any) => s.studentId === student2Id);
      expect(s2.verifiedSeconds).toBe(0);
      expect(s2.attendancePercentage).toBe(0);
      expect(s2.status).toBe('ABSENT');
    });

    it('Faculty can view individual student attendance with intervals', async () => {
      const res = await request(app).get(`/api/faculty/sessions/${sessionId}/attendance/${student1Id}`).set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intervals).toHaveLength(3);
      expect(res.body.data.verifiedSeconds).toBe(2700);
      expect(res.body.data.intervals[0].durationSeconds).toBe(1380);
      expect(res.body.data.intervals[1].durationSeconds).toBe(1080);
      expect(res.body.data.intervals[2].durationSeconds).toBe(240);
    });

    it('Student can view own attendance', async () => {
      const res = await request(app).get(`/api/student/sessions/${sessionId}/attendance`).set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verifiedSeconds).toBe(2700);
    });

    it('Student cannot view another student attendance', async () => {
      // Actually, students use /api/student/sessions/:sessionId/attendance which infers from their token
      // We didn't even expose a route for them to pass a studentId
      const res = await request(app).get(`/api/faculty/sessions/${sessionId}/attendance/${student1Id}`).set('Authorization', `Bearer ${student2Token}`);
      expect(res.status).toBe(403); // Since it requires FACULTY or ADMIN role
    });

    it('Finalizing session attendance persists records idempotently', async () => {
      // It's already ENDED, let's trigger the finalize manually or via a mock API to test the DB
      // We will import the service directly for this test
      const { AttendanceService } = await import('../src/services/attendance.service.js');
      
      await AttendanceService.finalizeSessionAttendance(sessionId);

      let records = await prisma.attendanceRecord.findMany({ where: { sessionId } });
      expect(records).toHaveLength(2);
      
      const s1Record = records.find(r => r.studentId === student1Id);
      expect(s1Record?.presencePercentage).toBe(75);
      expect(s1Record?.status).toBe('PRESENT');

      // Call it again to test idempotency
      await AttendanceService.finalizeSessionAttendance(sessionId);
      records = await prisma.attendanceRecord.findMany({ where: { sessionId } });
      expect(records).toHaveLength(2); // Should not duplicate
    });

    it('Handles events exactly at or outside session boundaries', async () => {
      const { AttendanceService } = await import('../src/services/attendance.service.js');
      // Create a dummy timeline to test the `calculateIntervals` directly
      const events: any[] = [
        { eventType: 'JOINED', timestamp: new Date('2025-01-01T09:50:00Z') }, // Before session
        { eventType: 'LEFT', timestamp: new Date('2025-01-01T11:10:00Z') } // After session
      ];

      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T11:00:00Z');

      const intervals = AttendanceService.calculateIntervals(events, start, end);
      expect(intervals).toHaveLength(1);
      expect(intervals[0].start).toEqual(start);
      expect(intervals[0].end).toEqual(end);
      expect(intervals[0].durationSeconds).toBe(3600);
    });
  });
});
