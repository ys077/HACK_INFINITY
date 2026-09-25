import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Faculty Management Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;
  
  let deptId: string;
  let newFacultyId: string;

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
    deptId = dept!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Faculty Management', () => {
    it('Admin should list faculty', async () => {
      const res = await request(app).get('/api/admin/faculty').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('Admin should create faculty', async () => {
      const res = await request(app).post('/api/admin/faculty').set('Authorization', `Bearer ${adminToken}`).send({
        email: 'newfaculty@presenza.edu',
        password: 'password123',
        employeeId: 'FAC999',
        name: 'New Faculty Test',
        departmentId: deptId
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      newFacultyId = res.body.data.id;
    });

    it('Admin should get faculty by id', async () => {
      const res = await request(app).get(`/api/admin/faculty/${newFacultyId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Faculty Test');
    });

    it('Admin should update faculty', async () => {
      const res = await request(app).put(`/api/admin/faculty/${newFacultyId}`).set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Updated Faculty Test'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Faculty Test');
    });

    it('Admin should change status', async () => {
      const res = await request(app).patch(`/api/admin/faculty/${newFacultyId}/status`).set('Authorization', `Bearer ${adminToken}`).send({
        status: 'INACTIVE'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Admin should fail on duplicate employee ID', async () => {
      const res = await request(app).post('/api/admin/faculty').set('Authorization', `Bearer ${adminToken}`).send({
        email: 'anotherfac@presenza.edu',
        password: 'password123',
        employeeId: 'FAC999', // duplicate
        name: 'Another Fac',
        departmentId: deptId
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Faculty Self-Profile', () => {
    it('Faculty should get own profile', async () => {
      const res = await request(app).get('/api/faculty/profile').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john.smith@presenza.edu');
    });

    it('Faculty should update allowed profile data', async () => {
      const res = await request(app).patch('/api/faculty/profile').set('Authorization', `Bearer ${facultyToken}`).send({
        name: 'John Updated'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('John Updated');
    });
  });

  describe('RBAC boundaries', () => {
    it('Student should not list faculty via admin route', async () => {
      const res = await request(app).get('/api/admin/faculty').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Student should not access faculty profile', async () => {
      const res = await request(app).get('/api/faculty/profile').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
