import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import { requireRole } from '../src/middleware/role.middleware.js';

// Add some test routes for RBAC
app.get('/api/test/admin', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.json({ success: true, message: 'Admin route' });
});

app.get('/api/test/faculty', requireAuth, requireRole('FACULTY'), (req, res) => {
  res.json({ success: true, message: 'Faculty route' });
});

app.get('/api/test/student', requireAuth, requireRole('STUDENT'), (req, res) => {
  res.json({ success: true, message: 'Student route' });
});

describe('RBAC Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // We assume the DB is seeded.
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Role', () => {
    it('should access admin route', async () => {
      const res = await request(app).get('/api/test/admin').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Faculty Role', () => {
    it('should access faculty route', async () => {
      const res = await request(app).get('/api/test/faculty').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not access admin route', async () => {
      const res = await request(app).get('/api/test/admin').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Student Role', () => {
    it('should access student route', async () => {
      const res = await request(app).get('/api/test/student').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not access admin route', async () => {
      const res = await request(app).get('/api/test/admin').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not access faculty route', async () => {
      const res = await request(app).get('/api/test/faculty').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
