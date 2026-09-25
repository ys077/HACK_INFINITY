import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';
import { WebDeviceKeyProvider } from '../src/device/web-device-key.provider.js';
import { verifySignature } from '../src/utils/deviceCrypto.js';

describe('Module 12 - Authorized Student Device Registration', () => {
  let student1Token: string;
  let student2Token: string;
  let adminToken: string;
  
  let student1Id: string;
  let student2Id: string;

  let deviceProvider: WebDeviceKeyProvider;
  let publicKeyBase64: string;
  
  let registeredDeviceId: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

    const resStudent1 = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    student1Token = resStudent1.body.data.accessToken;

    const resStudent2 = await request(app).post('/api/auth/login').send({ email: 'student2@presenza.edu', password: 'password123' });
    student2Token = resStudent2.body.data.accessToken;

    const student1 = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });
    student1Id = student1!.id;

    const student2 = await prisma.student.findFirst({ where: { user: { email: 'student2@presenza.edu' } } });
    student2Id = student2!.id;

    await prisma.studentDevice.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Key Provider and Registration', () => {
    it('Should generate a valid key pair via WebDeviceKeyProvider', async () => {
      deviceProvider = new WebDeviceKeyProvider();
      await deviceProvider.generateKeyPair();
      
      const pubKey = await deviceProvider.getPublicKey();
      expect(pubKey).toBeDefined();
      expect(typeof pubKey).toBe('string');
      publicKeyBase64 = pubKey!;
    });

    it('Should allow authenticated student to register device with valid public key', async () => {
      const res = await request(app)
        .post('/api/student/devices/register')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          publicKey: publicKeyBase64,
          deviceName: 'My Student Phone'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.fingerprint).toBeDefined();
      
      registeredDeviceId = res.body.data.id;
    });

    it('Should reject malformed public keys', async () => {
      const res = await request(app)
        .post('/api/student/devices/register')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          publicKey: 'not-a-valid-base64-spki-key',
          deviceName: 'Hacker Phone'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('INVALID_PUBLIC_KEY');
    });

    it('Should reject duplicate active registration of the same key for same student', async () => {
      const res = await request(app)
        .post('/api/student/devices/register')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          publicKey: publicKeyBase64,
          deviceName: 'My Student Phone Clone'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('DEVICE_ALREADY_ACTIVE');
    });

    it('Should reject duplicate registration of the same key for different student', async () => {
      const res = await request(app)
        .post('/api/student/devices/register')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          publicKey: publicKeyBase64, // Student 2 trying to use Student 1's key
          deviceName: 'Stolen Phone'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('DEVICE_ALREADY_REGISTERED');
    });
  });

  describe('Cryptographic Verification', () => {
    it('Should sign and verify a message successfully', async () => {
      const message = 'CHALLENGE_123456';
      const signature = await deviceProvider.sign(message);
      
      const isValid = verifySignature(publicKeyBase64, message, signature);
      expect(isValid).toBe(true);
    });

    it('Should fail verification if message is altered', async () => {
      const message = 'CHALLENGE_123456';
      const signature = await deviceProvider.sign(message);
      
      const isValid = verifySignature(publicKeyBase64, 'ALTERED_CHALLENGE', signature);
      expect(isValid).toBe(false);
    });

    it('Should fail verification if signature is tampered', async () => {
      const message = 'CHALLENGE_123456';
      let signature = await deviceProvider.sign(message);
      // tamper with signature
      signature = signature.substring(0, signature.length - 2) + 'AA';
      
      const isValid = verifySignature(publicKeyBase64, message, signature);
      expect(isValid).toBe(false);
    });
  });

  describe('Device Listing and Access Control', () => {
    it('Student can list own devices safely (no private keys exposed)', async () => {
      const res = await request(app)
        .get('/api/student/devices')
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      
      const device = res.body.data[0];
      expect(device.deviceName).toBe('My Student Phone');
      expect(device.devicePublicKey).toBeUndefined(); // Should not even return raw public key if not needed, definitely no private key
    });

    it('Student can get device details', async () => {
      const res = await request(app)
        .get(`/api/student/devices/${registeredDeviceId}`)
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(registeredDeviceId);
    });

    it('Student cannot get another students device details', async () => {
      const res = await request(app)
        .get(`/api/student/devices/${registeredDeviceId}`)
        .set('Authorization', `Bearer ${student2Token}`);
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('DEVICE_NOT_FOUND');
    });

    it('Admin can view student devices safely', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${student1Id}/devices`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].devicePublicKey).toBeUndefined(); // Checking for safe metadata
    });
  });

  describe('Revocation Policy', () => {
    it('Student can revoke own device', async () => {
      const res = await request(app)
        .post(`/api/student/devices/${registeredDeviceId}/revoke`)
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REVOKED');
    });

    it('Revoked device shows up as REVOKED in list', async () => {
      const res = await request(app)
        .get('/api/student/devices')
        .set('Authorization', `Bearer ${student1Token}`);
      
      expect(res.body.data[0].status).toBe('REVOKED');
    });

    it('Should not allow active registration of revoked device again if another device was requested (safeguard check)', async () => {
      const res = await request(app)
        .post('/api/student/devices/register')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          publicKey: publicKeyBase64,
          deviceName: 'Trying to register revoked key'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('DEVICE_REVOKED'); // Since we explicitly check in service if existing key is revoked.
    });
  });
});
