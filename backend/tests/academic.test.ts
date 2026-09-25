import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Academic Management Module Tests', () => {
  let adminToken: string;
  let studentToken: string;

  let newDeptId: string;
  let newCourseId: string;
  let newSectionId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@presenza.edu',
      password: 'password123'
    });
    adminToken = resAdmin.body.data.accessToken;

    const resStudent = await request(app).post('/api/auth/login').send({
      email: 'student1@presenza.edu',
      password: 'password123'
    });
    studentToken = resStudent.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Department Management', () => {
    it('Admin should create department', async () => {
      const res = await request(app).post('/api/admin/departments').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Mechanical Engineering',
        code: 'MECH'
      });
      expect(res.status).toBe(201);
      newDeptId = res.body.data.id;
    });

    it('Admin should list departments', async () => {
      const res = await request(app).get('/api/admin/departments').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Duplicate code rejected', async () => {
      const res = await request(app).post('/api/admin/departments').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Another',
        code: 'MECH'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Course Management', () => {
    it('Admin should create course', async () => {
      const res = await request(app).post('/api/admin/courses').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'B.E Mechanical',
        code: 'BEME',
        departmentId: newDeptId
      });
      expect(res.status).toBe(201);
      newCourseId = res.body.data.id;
    });
  });

  describe('Section Management', () => {
    it('Admin should create section', async () => {
      const res = await request(app).post('/api/admin/sections').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'MECH-A',
        year: 2,
        courseId: newCourseId
      });
      expect(res.status).toBe(201);
      newSectionId = res.body.data.id;
    });
  });

  describe('Subject Management', () => {
    it('Admin should create subject', async () => {
      const res = await request(app).post('/api/admin/subjects').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Thermodynamics',
        code: 'MECH201',
        credits: 4
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Classroom Management', () => {
    it('Admin should create classroom', async () => {
      const res = await request(app).post('/api/admin/classrooms').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Room 201',
        building: 'Mechanical Block',
        floor: '2',
        roomNumber: '201'
      });
      expect(res.status).toBe(201);
    });
  });

  describe('RBAC boundary', () => {
    it('Student cannot create department', async () => {
      const res = await request(app).post('/api/admin/departments').set('Authorization', `Bearer ${studentToken}`).send({
        name: 'Test',
        code: 'TEST'
      });
      expect(res.status).toBe(403);
    });
  });
});
