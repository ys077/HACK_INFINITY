import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Class Management Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;

  let newClassId: string;

  let subjectId: string;
  let sectionId: string;
  let facultyId: string;
  let classroomId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

    const resFaculty = await request(app).post('/api/auth/login').send({ email: 'john.smith@presenza.edu', password: 'password123' });
    facultyToken = resFaculty.body.data.accessToken;

    const resStudent = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    studentToken = resStudent.body.data.accessToken;

    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.findFirst();
    const faculty = await prisma.faculty.findFirst({ where: { user: { email: 'john.smith@presenza.edu' } } });
    const classroom = await prisma.classroom.findFirst();

    subjectId = subject!.id;
    sectionId = section!.id;
    facultyId = faculty!.id;
    classroomId = classroom!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Class Management', () => {
    it('Admin creates valid class', async () => {
      const res = await request(app).post('/api/admin/classes').set('Authorization', `Bearer ${adminToken}`).send({
        subjectId,
        sectionId,
        facultyId,
        classroomId
      });
      expect(res.status).toBe(201);
      newClassId = res.body.data.id;
    });

    it('Invalid subject rejected', async () => {
      const res = await request(app).post('/api/admin/classes').set('Authorization', `Bearer ${adminToken}`).send({
        subjectId: '00000000-0000-0000-0000-000000000000',
        sectionId,
        facultyId,
        classroomId
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Faculty Class View', () => {
    it('Faculty can view own class', async () => {
      const res = await request(app).get(`/api/faculty/classes/${newClassId}`).set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(newClassId);
    });

    it('Faculty cannot view another faculty class', async () => {
      // create a class for another faculty
      const anotherFaculty = await prisma.faculty.findFirst({ where: { user: { email: 'jane.doe@presenza.edu' } } });
      const anotherClass = await prisma.class.create({
        data: {
          subjectId,
          sectionId,
          facultyId: anotherFaculty!.id,
          classroomId
        }
      });
      const res = await request(app).get(`/api/faculty/classes/${anotherClass.id}`).set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Student Class View', () => {
    it('Student cannot access arbitrary class', async () => {
      const res = await request(app).get(`/api/student/classes/${newClassId}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(404); // Not enrolled
    });
  });
});
