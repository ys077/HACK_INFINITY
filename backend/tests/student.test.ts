import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Student Management Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;
  
  let deptId: string;
  let courseId: string;
  let sectionId: string;
  
  let newStudentId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@presenza.edu',
      password: 'password123'
    });
    adminToken = resAdmin.body.data.accessToken;

    const resFaculty = await request(app).post('/api/auth/login').send({
      email: 'john.smith@presenza.edu',
      password: 'password123'
    });
    facultyToken = resFaculty.body.data.accessToken;

    const resStudent = await request(app).post('/api/auth/login').send({
      email: 'student1@presenza.edu',
      password: 'password123'
    });
    studentToken = resStudent.body.data.accessToken;

    const dept = await prisma.department.findFirst();
    const course = await prisma.course.findFirst();
    const section = await prisma.section.findFirst();
    
    deptId = dept!.id;
    courseId = course!.id;
    sectionId = section!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Student Management', () => {
    it('Admin should list students', async () => {
      const res = await request(app).get('/api/admin/students').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('Admin should create student', async () => {
      const res = await request(app).post('/api/admin/students').set('Authorization', `Bearer ${adminToken}`).send({
        email: 'newstudent@presenza.edu',
        password: 'password123',
        studentId: '99CS999',
        name: 'New Student Test',
        departmentId: deptId,
        courseId: courseId,
        sectionId: sectionId,
        year: 2
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      newStudentId = res.body.data.id;
    });

    it('Admin should get student by id', async () => {
      const res = await request(app).get(`/api/admin/students/${newStudentId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Student Test');
    });

    it('Admin should update student', async () => {
      const res = await request(app).put(`/api/admin/students/${newStudentId}`).set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Updated Student Test'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Student Test');
    });

    it('Admin should change status', async () => {
      const res = await request(app).patch(`/api/admin/students/${newStudentId}/status`).set('Authorization', `Bearer ${adminToken}`).send({
        status: 'INACTIVE'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Admin should fail on duplicate student ID', async () => {
      const res = await request(app).post('/api/admin/students').set('Authorization', `Bearer ${adminToken}`).send({
        email: 'another@presenza.edu',
        password: 'password123',
        studentId: '99CS999', // duplicate
        name: 'Another',
        departmentId: deptId,
        courseId: courseId,
        sectionId: sectionId,
        year: 2
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
    
    it('Admin should fail on duplicate email', async () => {
      const res = await request(app).post('/api/admin/students').set('Authorization', `Bearer ${adminToken}`).send({
        email: 'newstudent@presenza.edu', // duplicate
        password: 'password123',
        studentId: '99CS998',
        name: 'Another',
        departmentId: deptId,
        courseId: courseId,
        sectionId: sectionId,
        year: 2
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Student Self-Profile', () => {
    it('Student should get own profile', async () => {
      const res = await request(app).get('/api/student/profile').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('student1@presenza.edu');
    });

    it('Student should update allowed profile data', async () => {
      const res = await request(app).patch('/api/student/profile').set('Authorization', `Bearer ${studentToken}`).send({
        name: 'My New Name'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('My New Name');
    });
  });

  describe('RBAC boundaries', () => {
    it('Faculty should not list students via admin route', async () => {
      const res = await request(app).get('/api/admin/students').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Student should not list students via admin route', async () => {
      const res = await request(app).get('/api/admin/students').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Faculty should not access student profile', async () => {
      const res = await request(app).get('/api/student/profile').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
