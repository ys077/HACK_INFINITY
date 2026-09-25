import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Attendance Session Engine Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let anotherFacultyToken: string;
  let studentToken: string;
  let unassignedStudentToken: string;

  let targetClassId: string;
  let sessionId: string;
  
  let facultyId: string;
  let studentId: string;
  let unassignedStudentId: string;

  beforeAll(async () => {
    // Authenticate Admin
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

    // Authenticate Faculty (John Smith)
    const resFaculty = await request(app).post('/api/auth/login').send({ email: 'john.smith@presenza.edu', password: 'password123' });
    facultyToken = resFaculty.body.data.accessToken;

    // Authenticate another Faculty (Jane Doe)
    const resAnotherFaculty = await request(app).post('/api/auth/login').send({ email: 'jane.doe@presenza.edu', password: 'password123' });
    anotherFacultyToken = resAnotherFaculty.body.data.accessToken;

    // Authenticate Student 1
    const resStudent = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    studentToken = resStudent.body.data.accessToken;

    // Authenticate Student 2
    const resStudent2 = await request(app).post('/api/auth/login').send({ email: 'student2@presenza.edu', password: 'password123' });
    unassignedStudentToken = resStudent2.body.data.accessToken;

    const faculty = await prisma.faculty.findFirst({ where: { user: { email: 'john.smith@presenza.edu' } } });
    facultyId = faculty!.id;

    const student = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });
    studentId = student!.id;
    
    const unassignedStudent = await prisma.student.findFirst({ where: { user: { email: 'student2@presenza.edu' } } });
    unassignedStudentId = unassignedStudent!.id;

    // Clear existing sessions
    await prisma.attendanceSession.deleteMany({});
    // Setup a clean class
    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.findFirst();
    const classroom = await prisma.classroom.findFirst();

    const cls = await prisma.class.create({
      data: {
        subjectId: subject!.id,
        sectionId: section!.id,
        facultyId: faculty!.id,
        classroomId: classroom!.id
      }
    });
    targetClassId = cls.id;

    // Enroll only student1
    await prisma.enrollment.create({
      data: {
        classId: targetClassId,
        studentId: studentId,
        status: 'ACTIVE'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Session Creation', () => {
    it('Faculty cannot start session for another faculty class', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

      const res = await request(app).post('/api/faculty/sessions').set('Authorization', `Bearer ${anotherFacultyToken}`).send({
        classId: targetClassId,
        expectedEndAt: futureDate.toISOString()
      });
      expect(res.status).toBe(403);
    });

    it('Faculty can start session for own class', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

      const res = await request(app).post('/api/faculty/sessions').set('Authorization', `Bearer ${facultyToken}`).send({
        classId: targetClassId,
        expectedEndAt: futureDate.toISOString()
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      
      sessionId = res.body.data.id;
    });

    it('Duplicate active session rejected', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

      const res = await request(app).post('/api/faculty/sessions').set('Authorization', `Bearer ${facultyToken}`).send({
        classId: targetClassId,
        expectedEndAt: futureDate.toISOString()
      });
      expect(res.status).toBe(409);
    });
  });

  describe('Session Details', () => {
    it('Faculty can view own session', async () => {
      const res = await request(app).get(`/api/faculty/sessions/${sessionId}`).set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sessionId);
    });

    it('Faculty cannot view another faculty session', async () => {
      const res = await request(app).get(`/api/faculty/sessions/${sessionId}`).set('Authorization', `Bearer ${anotherFacultyToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Student Visibility', () => {
    it('Enrolled student sees active session', async () => {
      const res = await request(app).get('/api/student/sessions/active').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const sessionIds = res.body.data.map((s: any) => s.id);
      expect(sessionIds).toContain(sessionId);
    });

    it('Unenrolled student does not see session', async () => {
      const res = await request(app).get('/api/student/sessions/active').set('Authorization', `Bearer ${unassignedStudentToken}`);
      expect(res.status).toBe(200);
      const sessionIds = res.body.data.map((s: any) => s.id);
      expect(sessionIds).not.toContain(sessionId);
    });
  });

  describe('Session Ending', () => {
    it('Student cannot end session', async () => {
      const res = await request(app).post(`/api/faculty/sessions/${sessionId}/end`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403); // Role restriction
    });

    it('Faculty cannot end another faculty session', async () => {
      const res = await request(app).post(`/api/faculty/sessions/${sessionId}/end`).set('Authorization', `Bearer ${anotherFacultyToken}`);
      expect(res.status).toBe(403); // Ownership restriction
    });

    it('Faculty can end own session', async () => {
      const res = await request(app).post(`/api/faculty/sessions/${sessionId}/end`).set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ENDED');
    });

    it('Already ended session cannot be ended again', async () => {
      const res = await request(app).post(`/api/faculty/sessions/${sessionId}/end`).set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(409);
    });
  });
});
