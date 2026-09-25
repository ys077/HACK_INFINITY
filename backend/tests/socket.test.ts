import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app, server } from '../src/server.js';
import { prisma } from '../src/lib/prisma.js';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { DeviceChallengeService } from '../src/services/device-challenge.service.js';

vi.spyOn(DeviceChallengeService, 'validateRecentVerification').mockResolvedValue(true);

describe('Socket.IO Real-Time Updates Module Tests', () => {
  let facultyToken: string;
  let student1Token: string;
  let student2Token: string;
  let adminToken: string;
  
  let sessionId: string;
  let targetClassId: string;
  let port: number;

  beforeAll(async () => {
    // Start HTTP server for WebSockets
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });

    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@presenza.edu', password: 'password123' });
    adminToken = resAdmin.body.data.accessToken;

    const resFaculty = await request(app).post('/api/auth/login').send({ email: 'john.smith@presenza.edu', password: 'password123' });
    facultyToken = resFaculty.body.data.accessToken;

    const resStudent1 = await request(app).post('/api/auth/login').send({ email: 'student1@presenza.edu', password: 'password123' });
    student1Token = resStudent1.body.data.accessToken;

    const resStudent2 = await request(app).post('/api/auth/login').send({ email: 'student2@presenza.edu', password: 'password123' });
    student2Token = resStudent2.body.data.accessToken; // Not enrolled

    const faculty = await prisma.faculty.findFirst({ where: { user: { email: 'john.smith@presenza.edu' } } });
    const student1 = await prisma.student.findFirst({ where: { user: { email: 'student1@presenza.edu' } } });

    await prisma.presenceEvent.deleteMany({});
    await prisma.attendanceSession.deleteMany({});
    
    // Setup class and session
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
      data: { classId: targetClassId, studentId: student1!.id, status: 'ACTIVE' }
    });

    // Start a session
    const resSession = await request(app).post('/api/faculty/sessions').set('Authorization', `Bearer ${facultyToken}`).send({
      classId: targetClassId,
      expectedEndAt: new Date(Date.now() + 3600000).toISOString()
    });
    sessionId = resSession.body.data.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await prisma.$disconnect();
  });

  const connectClient = (token?: string): Promise<ClientSocket> => {
    return new Promise((resolve) => {
      const client = Client(`http://localhost:${port}`, {
        auth: token ? { token } : undefined
      });
      client.on('connect', () => resolve(client));
      client.on('connect_error', () => resolve(client)); // Resolve even on error to test auth rejections
    });
  };

  it('Rejects unauthenticated socket connections', async () => {
    const client = await connectClient();
    expect(client.connected).toBe(false);
    client.disconnect();
  });

  it('Accepts authenticated socket connections', async () => {
    const client = await connectClient(student1Token);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('Prevents unenrolled student from joining room', async () => {
    const client = await connectClient(student2Token);
    
    const response = await new Promise<any>((resolve) => {
      client.emit('session:join', { sessionId }, (res: any) => resolve(res));
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('NOT_ENROLLED');
    client.disconnect();
  });

  it('Allows enrolled student to join room and receive events', async () => {
    const facultyClient = await connectClient(facultyToken);
    const studentClient = await connectClient(student1Token);

    // Faculty joins room
    await new Promise<any>((resolve) => {
      facultyClient.emit('session:join', { sessionId }, (res: any) => resolve(res));
    });

    // Setup listener on faculty client to hear student join
    const joinEventPromise = new Promise<any>((resolve) => {
      facultyClient.on('student:joined', (data) => resolve(data));
    });

    // Student joins room
    const joinRes = await new Promise<any>((resolve) => {
      studentClient.emit('session:join', { sessionId }, (res: any) => resolve(res));
    });

    expect(joinRes.success).toBe(true);
    expect(joinRes.sessionId).toBe(sessionId);

    // Trigger JOIN via REST API (this would normally happen before socket connect or in parallel)
    const restRes = await request(app).post('/api/presence/join').set('Authorization', `Bearer ${student1Token}`).send({ sessionId, deviceId: 'test-device' });
    expect(restRes.status).toBe(200);

    // Verify broadcast was received
    const broadcastData = await joinEventPromise;
    expect(broadcastData.sessionId).toBe(sessionId);
    expect(broadcastData.eventType).toBe('JOINED');

    studentClient.disconnect();
    facultyClient.disconnect();
  });

  it('Broadcasts heartbeat events correctly', async () => {
    const facultyClient = await connectClient(facultyToken);
    await new Promise<any>((resolve) => facultyClient.emit('session:join', { sessionId }, resolve));

    const heartbeatEventPromise = new Promise<any>((resolve) => {
      facultyClient.on('student:heartbeat', (data) => resolve(data));
    });

    const restRes = await request(app).post('/api/presence/heartbeat').set('Authorization', `Bearer ${student1Token}`).send({ sessionId });
    expect(restRes.status).toBe(200);

    const broadcastData = await heartbeatEventPromise;
    expect(broadcastData.eventType).toBe('HEARTBEAT');

    facultyClient.disconnect();
  });

  it('Broadcasts left events correctly', async () => {
    const facultyClient = await connectClient(facultyToken);
    await new Promise<any>((resolve) => facultyClient.emit('session:join', { sessionId }, resolve));

    const leftEventPromise = new Promise<any>((resolve) => {
      facultyClient.on('student:left', (data) => resolve(data));
    });

    await request(app).post('/api/presence/leave').set('Authorization', `Bearer ${student1Token}`).send({ sessionId });

    const broadcastData = await leftEventPromise;
    expect(broadcastData.eventType).toBe('LEFT');

    facultyClient.disconnect();
  });

  it('Broadcasts session:ended event', async () => {
    const studentClient = await connectClient(student1Token);
    await new Promise<any>((resolve) => studentClient.emit('session:join', { sessionId }, resolve));

    const sessionEndedEventPromise = new Promise<any>((resolve) => {
      studentClient.on('session:ended', (data) => resolve(data));
    });

    await request(app).post(`/api/faculty/sessions/${sessionId}/end`).set('Authorization', `Bearer ${facultyToken}`);

    const broadcastData = await sessionEndedEventPromise;
    expect(broadcastData.status).toBe('ENDED');
    expect(broadcastData.sessionId).toBe(sessionId);

    studentClient.disconnect();
  });
});
