import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';
import { WebDeviceKeyProvider } from '../src/device/web-device-key.provider.js';
import { buildCanonicalPayload } from '../src/utils/deviceCrypto.js';

describe('Module 13 - Secure Device Challenge-Response', () => {
  let student1Token: string;
  let student2Token: string;
  let adminToken: string;
  
  let student1Id: string;
  let student2Id: string;

  let deviceProvider1: WebDeviceKeyProvider;
  let deviceProvider2: WebDeviceKeyProvider;
  let registeredDeviceId1: string;
  let registeredDeviceId2: string;
  
  let sessionId1: string;
  let sessionId2: string;

  beforeAll(async () => {
    // 1. Authenticate users
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

    // 2. Setup Devices
    await prisma.studentDevice.deleteMany({});
    
    deviceProvider1 = new WebDeviceKeyProvider();
    await deviceProvider1.generateKeyPair();
    const pub1 = await deviceProvider1.getPublicKey();
    const d1 = await request(app).post('/api/student/devices/register').set('Authorization', `Bearer ${student1Token}`).send({ publicKey: pub1, deviceName: 'D1' });
    registeredDeviceId1 = d1.body.data.id;

    deviceProvider2 = new WebDeviceKeyProvider();
    await deviceProvider2.generateKeyPair();
    const pub2 = await deviceProvider2.getPublicKey();
    const d2 = await request(app).post('/api/student/devices/register').set('Authorization', `Bearer ${student2Token}`).send({ publicKey: pub2, deviceName: 'D2' });
    registeredDeviceId2 = d2.body.data.id;

    // 3. Setup active sessions (enrollments usually match from seed data: student1 is enrolled in CS101, student2 might be in something else or both)
    // Both are enrolled in CS101 Section A based on seed data.
    const enrollments1 = await prisma.enrollment.findMany({ where: { studentId: student1Id }, include: { class: true } });
    const classId1 = enrollments1[0].classId;
    
    const enrollments2 = await prisma.enrollment.findMany({ where: { studentId: student2Id }, include: { class: true } });
    const classId2 = enrollments2[0].classId; // Student 2 might be in a different class, or same. 

    // Create session for classId1
    const faculty = await prisma.faculty.findFirst({ where: { classes: { some: { id: classId1 } } } });
    const session1 = await prisma.attendanceSession.create({
      data: {
        classId: classId1,
        facultyId: faculty!.id,
        expectedEndAt: new Date(Date.now() + 3600000),
        status: 'IN_PROGRESS'
      }
    });
    sessionId1 = session1.id;

    const session2 = await prisma.attendanceSession.create({
      data: {
        classId: classId1, // let's use the same class so both are enrolled, just different session
        facultyId: faculty!.id,
        expectedEndAt: new Date(Date.now() + 3600000),
        status: 'IN_PROGRESS'
      }
    });
    sessionId2 = session2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Challenge Generation', () => {
    it('Should generate challenge successfully for enrolled student and active device', async () => {
      const res = await request(app)
        .post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: registeredDeviceId1,
          sessionId: sessionId1,
          purpose: 'PRESENCE_JOIN'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBeDefined();
      expect(res.body.data.challenge).toBeDefined();
    });

    it('Should fail challenge generation if student attempts to use another student\'s device', async () => {
      const res = await request(app)
        .post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: registeredDeviceId2, // Student 2's device
          sessionId: sessionId1,
          purpose: 'PRESENCE_JOIN'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('DEVICE_NOT_OWNED');
    });

    it('Should fail if student is not enrolled', async () => {
      const enrollments1 = await prisma.enrollment.findMany({ where: { studentId: student1Id }, include: { class: true } });
      const classId1 = enrollments1.length > 0 ? enrollments1[0].classId : 'dummy';

      const newClass = await prisma.class.findFirst({ where: { id: { not: classId1 } } }); 
      if (!newClass) return; 

      const newSession = await prisma.attendanceSession.create({
        data: { classId: newClass.id, facultyId: newClass.facultyId, expectedEndAt: new Date(), status: 'IN_PROGRESS' }
      });

      await prisma.enrollment.deleteMany({ where: { studentId: student1Id, classId: newClass.id } });

      const res = await request(app)
        .post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: registeredDeviceId1,
          sessionId: newSession.id,
          purpose: 'PRESENCE_JOIN'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('NOT_ENROLLED');
    });
  });

  describe('2. Challenge Verification (Signature)', () => {
    let challengeId: string;
    let challengeData: string;

    it('Should correctly verify a signed canonical payload', async () => {
      const chalRes = await request(app).post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: registeredDeviceId1, sessionId: sessionId1, purpose: 'PRESENCE_JOIN' });
      
      challengeId = chalRes.body.data.challengeId;
      challengeData = chalRes.body.data.challenge;

      const canonicalPayload = buildCanonicalPayload(
        challengeId, challengeData, registeredDeviceId1, student1Id, sessionId1, 'PRESENCE_JOIN'
      );
      
      const signature = await deviceProvider1.sign(canonicalPayload);

      const verRes = await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ challengeId, signature });
      
      expect(verRes.status).toBe(200);
      expect(verRes.body.success).toBe(true);
      expect(verRes.body.data.verified).toBe(true);
    });

    it('Should fail if signature is tampered with', async () => {
      const chalRes = await request(app).post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: registeredDeviceId1, sessionId: sessionId1, purpose: 'PRESENCE_JOIN' });
      
      const canonicalPayload = buildCanonicalPayload(
        chalRes.body.data.challengeId, chalRes.body.data.challenge, registeredDeviceId1, student1Id, sessionId1, 'PRESENCE_JOIN'
      );
      
      const signature = await deviceProvider1.sign(canonicalPayload);
      const tampered = signature.substring(0, signature.length - 2) + 'AA';

      const verRes = await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ challengeId: chalRes.body.data.challengeId, signature: tampered });
      
      expect(verRes.status).toBe(400);
      expect(verRes.body.message).toBe('DEVICE_VERIFICATION_FAILED'); // Map to INVALID_SIGNATURE internally
    });

    it('Should fail to verify an already used challenge (Replay Protection)', async () => {
      const verRes = await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ challengeId, signature: await deviceProvider1.sign(buildCanonicalPayload(challengeId, challengeData, registeredDeviceId1, student1Id, sessionId1, 'PRESENCE_JOIN')) });
      
      expect(verRes.status).toBe(400);
      expect(verRes.body.message).toBe('DEVICE_VERIFICATION_FAILED'); // CHALLENGE_ALREADY_USED
    });
  });

  describe('3. Presence Join / Rejoin Integration', () => {
    it('Should reject presence join if no verification exists for device', async () => {
      // Trying to join with student2 device without challenge
      const res = await request(app).post('/api/presence/join')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ sessionId: sessionId1, deviceId: registeredDeviceId2 });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('DEVICE_NOT_VERIFIED');
    });

    it('Should allow presence join immediately after successful challenge verification', async () => {
      // 1. Challenge
      const chalRes = await request(app).post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: registeredDeviceId1, sessionId: sessionId1, purpose: 'PRESENCE_JOIN' });
      
      // 2. Sign & Verify
      const canonical = buildCanonicalPayload(chalRes.body.data.challengeId, chalRes.body.data.challenge, registeredDeviceId1, student1Id, sessionId1, 'PRESENCE_JOIN');
      const sig = await deviceProvider1.sign(canonical);
      await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ challengeId: chalRes.body.data.challengeId, signature: sig });

      // 3. Join
      const joinRes = await request(app).post('/api/presence/join')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ sessionId: sessionId1, deviceId: registeredDeviceId1 });
      
      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.data.status).toBe('PRESENT');
    });
    it('Should fail join if verified for wrong purpose (e.g. REJOIN instead of JOIN)', async () => {
      // Ensure student2 is enrolled in the class that sessionId1 belongs to
      const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId1 } });
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: student2Id, classId: session!.classId }
      });
      if (!existingEnrollment) {
        await prisma.enrollment.create({
          data: { studentId: student2Id, classId: session!.classId, status: 'ACTIVE' }
        });
      }

      // Student 2 tries to JOIN with REJOIN challenge
      const chalRes = await request(app).post('/api/device/challenge')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ deviceId: registeredDeviceId2, sessionId: sessionId1, purpose: 'PRESENCE_REJOIN' }); // WRONG PURPOSE
      
      expect(chalRes.status).toBe(201);

      const canonical = buildCanonicalPayload(chalRes.body.data.challengeId, chalRes.body.data.challenge, registeredDeviceId2, student2Id, sessionId1, 'PRESENCE_REJOIN');
      const sig = await deviceProvider2.sign(canonical);
      await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ challengeId: chalRes.body.data.challengeId, signature: sig });

      // 3. Join (Expect fail because purpose in DB is REJOIN but Presence controller asks for JOIN)
      const joinRes = await request(app).post('/api/presence/join')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ sessionId: sessionId1, deviceId: registeredDeviceId2 });
      
      expect(joinRes.status).toBe(401);
      expect(joinRes.body.message).toBe('DEVICE_NOT_VERIFIED');
    });
  });

  describe('4. Revocation impact on challenge', () => {
    it('Should fail challenge verification if device gets revoked midway', async () => {
      const chalRes = await request(app).post('/api/device/challenge')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: registeredDeviceId1, sessionId: sessionId2, purpose: 'PRESENCE_JOIN' });
      
      // Revoke the device
      await request(app).post(`/api/student/devices/${registeredDeviceId1}/revoke`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Try verify
      const canonical = buildCanonicalPayload(chalRes.body.data.challengeId, chalRes.body.data.challenge, registeredDeviceId1, student1Id, sessionId2, 'PRESENCE_JOIN');
      const sig = await deviceProvider1.sign(canonical);
      const verRes = await request(app).post('/api/device/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ challengeId: chalRes.body.data.challengeId, signature: sig });
      
      expect(verRes.status).toBe(400); // DEVICE_VERIFICATION_FAILED
    });
  });
});
