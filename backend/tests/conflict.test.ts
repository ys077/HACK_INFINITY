import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Module 11 - Attendance Conflict Detection Tests', () => {
  let facultyToken: string;
  let adminToken: string;
  let student1Token: string;
  
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

    const faculty = await prisma.faculty.findFirst({ where: { user: { email: 'john.smith@presenza.edu' } } });
    facultyId = faculty!.id;

    const student1 = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });
    student1Id = student1!.id;

    const student2 = await prisma.student.findFirst({ where: { user: { email: 'student2@presenza.edu' } } });
    student2Id = student2!.id;

    await prisma.attendanceConflict.deleteMany({});
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
    
    // NOTE: student 2 is intentionally NOT enrolled for this class! (To test enrollment anomaly)
    
    const sessionStart = new Date('2027-01-01T10:00:00Z');
    const sessionEnd = new Date('2027-01-01T11:00:00Z');

    const session = await prisma.attendanceSession.create({
      data: { classId: cls.id, facultyId, startedAt: sessionStart, expectedEndAt: sessionEnd, endedAt: sessionEnd, status: 'ENDED' }
    });
    sessionId = session.id;

    // Events for Student 1 (Enrolled)
    // - JOINED at 09:50 (Before start!) -> Anomaly
    // - JOINED at 10:05 (Duplicate active presence!) -> Anomaly
    // - LEFT at 10:30
    // - REJOINED at 11:05 (After end!) -> Anomaly
    await prisma.presenceEvent.createMany({
      data: [
        { sessionId, studentId: student1Id, eventType: 'JOINED', timestamp: new Date('2027-01-01T09:50:00Z') },
        { sessionId, studentId: student1Id, eventType: 'JOINED', timestamp: new Date('2027-01-01T10:05:00Z') },
        { sessionId, studentId: student1Id, eventType: 'LEFT', timestamp: new Date('2027-01-01T10:30:00Z') },
        { sessionId, studentId: student1Id, eventType: 'REJOINED', timestamp: new Date('2027-01-01T11:05:00Z') }
      ]
    });

    // Events for Student 2 (NOT Enrolled) -> Anomaly
    await prisma.presenceEvent.createMany({
      data: [
        { sessionId, studentId: student2Id, eventType: 'JOINED', timestamp: new Date('2027-01-01T10:10:00Z') },
        { sessionId, studentId: student2Id, eventType: 'LEFT', timestamp: new Date('2027-01-01T10:20:00Z') }
      ]
    });

    const { AttendanceService } = await import('../src/services/attendance.service.js');
    await AttendanceService.finalizeSessionAttendance(sessionId);

    // Create artificial attendance mismatch
    // (We'll manipulate the db record directly)
    await prisma.attendanceRecord.update({
      where: { sessionId_studentId: { sessionId, studentId: student1Id } },
      data: { totalPresentSeconds: 9999 } // Incorrect value!
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Conflict Detection Logic', () => {
    it('Should detect session conflicts accurately', async () => {
      // Trigger scan explicitly via API
      const scanRes = await request(app)
        .post(`/api/faculty/sessions/${sessionId}/conflicts/scan`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(scanRes.status).toBe(200);

      // Verify what was created
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/conflicts`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const conflicts = res.body.data;
      
      // We expect:
      // Student 1: EVENT_BEFORE_SESSION_START, INVALID_STATE_TRANSITION, EVENT_AFTER_SESSION_END, ATTENDANCE_RECORD_MISMATCH
      // Student 2: NOT_ENROLLED

      const s1Conflicts = conflicts.filter((c: any) => c.studentId === student1Id);
      const s2Conflicts = conflicts.filter((c: any) => c.studentId === student2Id);

      expect(s1Conflicts.some((c: any) => c.evidence.anomaly === 'EVENT_BEFORE_SESSION_START')).toBe(true);
      expect(s1Conflicts.some((c: any) => c.evidence.anomaly === 'INVALID_STATE_TRANSITION')).toBe(true);
      expect(s1Conflicts.some((c: any) => c.evidence.anomaly === 'EVENT_AFTER_SESSION_END')).toBe(true);
      expect(s1Conflicts.some((c: any) => c.evidence.anomaly === 'ATTENDANCE_RECORD_MISMATCH')).toBe(true);
      
      expect(s2Conflicts.some((c: any) => c.evidence.anomaly === 'NOT_ENROLLED')).toBe(true);
    });

    it('Conflict creation is idempotent', async () => {
      const initialRes = await request(app).get(`/api/faculty/sessions/${sessionId}/conflicts`).set('Authorization', `Bearer ${facultyToken}`);
      const initialCount = initialRes.body.data.length;

      // Scan again
      await request(app).post(`/api/faculty/sessions/${sessionId}/conflicts/scan`).set('Authorization', `Bearer ${facultyToken}`);

      const subsequentRes = await request(app).get(`/api/faculty/sessions/${sessionId}/conflicts`).set('Authorization', `Bearer ${facultyToken}`);
      expect(subsequentRes.body.data.length).toBe(initialCount); // Should not increase
    });
  });

  describe('Conflict Authorization', () => {
    it('Faculty can view individual student conflicts', async () => {
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/students/${student1Id}/conflicts`)
        .set('Authorization', `Bearer ${facultyToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((c: any) => c.studentId === student1Id)).toBe(true);
    });

    it('Admin can view session conflicts', async () => {
      const res = await request(app)
        .get(`/api/admin/sessions/${sessionId}/conflicts`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Students cannot access conflict endpoints', async () => {
      const res = await request(app)
        .get(`/api/faculty/sessions/${sessionId}/conflicts`)
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(403);
    });
  });
});
