import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';

describe('Auth Module Tests', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // We assume the DB is seeded.
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should login as ADMIN successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@presenza.edu',
        password: 'password123'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      adminToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should login as FACULTY successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john.smith@presenza.edu',
        password: 'password123'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('FACULTY');
      facultyToken = res.body.data.accessToken;
    });

    it('should login as STUDENT successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'student1@presenza.edu',
        password: 'password123'
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      studentToken = res.body.data.accessToken;
    });

    it('should fail with invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@presenza.edu',
        password: 'wrongpassword'
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'notfound@presenza.edu',
        password: 'password123'
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with empty email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: '',
        password: 'password123'
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with empty password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@presenza.edu',
        password: ''
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get admin profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.profile).toBeDefined();
    });

    it('should get faculty profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('FACULTY');
      expect(res.body.data.profile).toBeDefined();
    });

    it('should get student profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.profile).toBeDefined();
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should fail with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
