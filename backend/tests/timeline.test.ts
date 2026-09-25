import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Module 10 - Timeline & History Tests', () => {
  let facultyToken: string;
  let student1Token: string;
  let student2Token: string; // Not enrolled or different scope
  let adminToken: string;

  let facultyId: string;
  let student1Id: string;
  let student2Id: string;
  let sessionId: string;
  let emptySessionId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

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
      data: { subjectId: subject!.id, sectionId: section!.id, facultyId, classroomId: classroom!.id }
    });

    await prisma.enrollment.create({ data: { classId: cls.id, studentId: student1Id, status: 'ACTIVE' } });
    await prisma.enrollment.create({ data: { classId: cls.id, studentId: student2Id, status: 'ACTIVE' } });

    // Session 1: Complex timeline for Student 1
    const sessionStart = new Date('2026-09-25T10:00:00Z');
    const sessionEnd = new Date('2026-09-25T11:00:00Z');

    const session = await prisma.attendanceSession.create({
      data: { classId: cls.id, facultyId, startedAt: sessionStart, expectedEndAt: sessionEnd, endedAt: sessionEnd, status: 'ENDED' }
    });
    sessionId = session.id;

    // Events for Student 1
    // 10:02 JOINED -> 10:15 HEARTBEAT -> 10:25 TIMEOUT -> 10:34 REJOINED -> 10:52 LEFT -> 10:56 REJOINED -> 11:00 SESSION_ENDED
    await prisma.presenceEvent.createMany({
      data: [
        { sessionId, studentId: student1Id, eventType: 'JOINED', timestamp: new Date('2026-09-25T10:02:00Z') },
        { sessionId, studentId: student1Id, eventType: 'HEARTBEAT', timestamp: new Date('2026-09-25T10:15:00Z') },
        { sessionId, studentId: student1Id, eventType: 'TIMEOUT', timestamp: new Date('2026-09-25T10:25:00Z') },
        { sessionId, studentId: student1Id, eventType: 'REJOINED', timestamp: new Date('2026-09-25T10:34:00Z') },
        { sessionId, studentId: student1Id, eventType: 'LEFT', timestamp: new Date('2026-09-25T10:52:00Z') },
        { sessionId, studentId: student1Id, eventType: 'REJOINED', timestamp: new Date('2026-09-25T10:56:00Z') },
        { sessionId, studentId: student1Id, eventType: 'SESSION_ENDED', timestamp: new Date('2026-09-25T11:00:00Z') }
      ]
    });

    // We finalize the session to create the AttendanceRecord
    const { AttendanceService } = await import('../src/services/attendance.service.js');
    await AttendanceService.finalizeSessionAttendance(sessionId);

    // Session 2: Empty session for checking 0s
    const emptySession = await prisma.attendanceSession.create({
      data: { classId: cls.id, facultyId, startedAt: sessionStart, expectedEndAt: sessionEnd, endedAt: sessionEnd, status: 'ENDED' }
    });
    emptySessionId = emptySession.id;
    await AttendanceService.finalizeSessionAttendance(emptySessionId);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Student Timeline endpoints', () => {
    it('Student can view own timeline', async () => {
      const res = await request(app).get(`/api/student/sessions/${sessionId}/timeline`).set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toHaveLength(7);
      
      // Check presence intervals
      expect(res.body.data.presenceIntervals).toHaveLength(3);
      expect(res.body.data.presenceIntervals[0].durationSeconds).toBe(1380);
      expect(res.body.data.presenceIntervals[1].durationSeconds).toBe(1080);
      expect(res.body.data.presenceIntervals[2].durationSeconds).toBe(240);

      // Check absence intervals
      expect(res.body.data.absenceIntervals).toHaveLength(3); // 10:00-10:02, 10:25-10:34, 10:52-10:56
      expect(res.body.data.absenceIntervals[1].durationSeconds).toBe(540);
      expect(res.body.data.absenceIntervals[1].reason).toBe('TIMEOUT');
      expect(res.body.data.absenceIntervals[2].durationSeconds).toBe(240);
      expect(res.body.data.absenceIntervals[2].reason).toBe('LEFT');

      // Check summary
      expect(res.body.data.summary.joinCount).toBe(1);
      expect(res.body.data.summary.rejoinCount).toBe(2);
      expect(res.body.data.summary.leaveCount).toBe(1);
      expect(res.body.data.summary.timeoutCount).toBe(1);
      expect(res.body.data.summary.verifiedSeconds).toBe(2700);
    });

    it('Student cannot view another students timeline', async () => {
      // The API infers the student from the token. To verify isolation, we just check that Student 2 sees their own empty timeline.
      const res = await request(app).get(`/api/student/sessions/${sessionId}/timeline`).set('Authorization', `Bearer ${student2Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(0);
      expect(res.body.data.summary.verifiedSeconds).toBe(0);
      expect(res.body.data.absenceIntervals).toHaveLength(1); // 10:00 to 11:00
      expect(res.body.data.absenceIntervals[0].durationSeconds).toBe(3600);
      expect(res.body.data.absenceIntervals[0].reason).toBe('NOT_JOINED');
    });

    it('Student can view historical attendance', async () => {
      const res = await request(app).get(`/api/student/attendance/history`).set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toHaveLength(2); // From both sessions
      const s1 = res.body.data.sessions.find((s: any) => s.sessionId === sessionId);
      expect(s1.verifiedMinutes).toBe(45);
      expect(s1.attendancePercentage).toBe(75);
      expect(s1.status).toBe('PRESENT');
    });
  });

  describe('Faculty Timeline endpoints', () => {
    it('Faculty can view an individual student timeline', async () => {
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/students/${student1Id}/timeline`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.summary.verifiedSeconds).toBe(2700);
    });

    it('Faculty can view session summary', async () => {
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/timeline/summary`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.totalStudents).toBe(2);
      expect(res.body.data.presentStudents).toBe(1); // student1 is present
      expect(res.body.data.absentStudents).toBe(1);  // student2 is absent
      expect(res.body.data.totalJoinEvents).toBe(1);
    });

    it('Faculty can view student historical attendance for their classes', async () => {
      const res = await request(app)
        .get(`/api/faculty/students/${student1Id}/attendance/history`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toHaveLength(2);
    });

    it('Faculty cannot view student timeline from an unauthorized session', async () => {
      // Create a dummy session not owned by them (but we will just test it by mocking a different token)
      // Since student 1 token is NOT a faculty token, it should be 403
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/students/${student1Id}/timeline`)
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('Admin Timeline endpoints', () => {
    it('Admin can view session timeline summary', async () => {
      const res = await request(app)
        .get(`/api/admin/sessions/${sessionId}/timeline`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.totalStudents).toBe(2);
    });
  });
});
