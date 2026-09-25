import { prisma } from './lib/prisma.js';
import { PresenceService } from './services/presence.service.js';
import { DeviceChallengeService } from './services/device-challenge.service.js';
import * as crypto from 'crypto';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('--- STARTING PHASE 3 TEST ---');
  
  // 1. Setup Test Data
  const studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' }, include: { student: true } });
  const facultyUser = await prisma.user.findFirst({ where: { role: 'FACULTY' }, include: { faculty: true } });
  const testClass = await prisma.class.findFirst();

  if (!studentUser || !facultyUser || !testClass) {
    console.error('Missing test data. Please run seed script first.');
    return;
  }

  const studentId = studentUser.student!.id;
  
  console.log('Test User:', studentUser.email);
  
  // Create Session
  const session = await prisma.attendanceSession.create({
    data: {
      classId: testClass.id,
      facultyId: facultyUser.faculty!.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      expectedEndAt: new Date(Date.now() + 3600000) // 1 hour from now
    }
  });
  console.log('Created Session:', session.id);

  // 2. Register Device manually
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });

  const device = await prisma.studentDevice.create({
    data: {
      studentId: studentId,
      deviceFingerprint: crypto.randomBytes(16).toString('hex'),
      devicePublicKey: publicKey.toString('base64'),
      browser: 'TestBrowser',
      platform: 'WEB'
    }
  });
  console.log('Registered Device:', device.id);

  try {
    // 3. Test Join / Rejoin Challenge
    console.log('\n--- Testing Join ---');
    const challengeData = await DeviceChallengeService.generateChallenge(studentId, device.id, session.id, 'PRESENCE_JOIN');
    console.log('Generated Join Challenge:', challengeData.challenge);
    
    // Sign
    const { buildCanonicalPayload } = await import('./utils/deviceCrypto.js');
    const canonicalPayloadJoin = buildCanonicalPayload(challengeData.id, challengeData.challenge, device.id, studentId, session.id, 'PRESENCE_JOIN');
    const sign = crypto.createSign('SHA256');
    sign.update(canonicalPayloadJoin);
    const signature = sign.sign({ key: privateKey, format: 'der', type: 'pkcs8' }).toString('base64');
    
    // Verify
    const verifyResult = await DeviceChallengeService.verifyChallenge(studentId, challengeData.id, signature);
    console.log('Verify Result:', verifyResult);

    // Join Presence
    const state = await PresenceService.join(session.id, studentId, device.id);
    console.log('Joined Presence State:', state);

    // 4. Test Heartbeats
    console.log('\n--- Testing Heartbeat ---');
    for (let i = 1; i <= 3; i++) {
      await delay(2000); // 2 seconds
      
      const hbChallenge = await DeviceChallengeService.generateChallenge(studentId, device.id, session.id, 'PRESENCE_HEARTBEAT');
      const canonicalPayloadHb = buildCanonicalPayload(hbChallenge.id, hbChallenge.challenge, device.id, studentId, session.id, 'PRESENCE_HEARTBEAT');
      const hbSign = crypto.createSign('SHA256');
      hbSign.update(canonicalPayloadHb);
      const hbSignature = hbSign.sign({ key: privateKey, format: 'der', type: 'pkcs8' }).toString('base64');
      
      await DeviceChallengeService.verifyChallenge(studentId, hbChallenge.id, hbSignature);
      const isValid = await DeviceChallengeService.validateRecentVerification(studentId, device.id, session.id, 'PRESENCE_HEARTBEAT');
      console.log(`Heartbeat ${i} Validated:`, isValid);
      
      const hbState = await PresenceService.heartbeat(session.id, studentId);
      console.log(`Heartbeat ${i} State:`, hbState);
    }

    // 5. Replay old challenge
    console.log('\n--- Testing Replay Attack ---');
    try {
      const hbChallengeReplay = await DeviceChallengeService.generateChallenge(studentId, device.id, session.id, 'PRESENCE_HEARTBEAT');
      const canonicalPayloadReplay = buildCanonicalPayload(hbChallengeReplay.id, hbChallengeReplay.challenge, device.id, studentId, session.id, 'PRESENCE_HEARTBEAT');
      const hbSignReplay = crypto.createSign('SHA256');
      hbSignReplay.update(canonicalPayloadReplay);
      const hbSignatureReplay = hbSignReplay.sign({ key: privateKey, format: 'der', type: 'pkcs8' }).toString('base64');
      
      console.log('Replay Attempt 1 (First use):');
      await DeviceChallengeService.verifyChallenge(studentId, hbChallengeReplay.id, hbSignatureReplay);
      console.log('First use successful.');
      
      console.log('Replay Attempt 2 (Second use of same challenge/sig):');
      await DeviceChallengeService.verifyChallenge(studentId, hbChallengeReplay.id, hbSignatureReplay);
      console.log('Replay SUCCEEDED (This is BAD!)');
    } catch (err: any) {
      console.log('Replay blocked successfully:', err.message);
    }

    // 6. Test Disconnect -> GRACE -> TIMEOUT
    console.log('\n--- Testing Grace and Timeout ---');
    console.log('Waiting for GRACE (Simulating 35 seconds by modifying the lastHeartbeatAt directly)');
    
    // We modify lastHeartbeat to simulate time passing
    await prisma.attendanceRecord.update({
      where: { sessionId_studentId: { sessionId: session.id, studentId: studentId } },
      data: {
        lastHeartbeatAt: new Date(Date.now() - 35000) // 35 seconds ago
      }
    });

    let currentState = await PresenceService.getStudentState(session.id, studentId);
    console.log('State after 35s offline:', currentState);

    console.log('Waiting for TIMEOUT (Simulating 150 seconds)');
    await prisma.attendanceRecord.update({
      where: { sessionId_studentId: { sessionId: session.id, studentId: studentId } },
      data: {
        lastHeartbeatAt: new Date(Date.now() - 150000) // 150 seconds ago
      }
    });

    currentState = await PresenceService.getStudentState(session.id, studentId);
    console.log('State after 150s offline:', currentState);

    // 7. Test Reconnect after TIMEOUT
    console.log('\n--- Testing Reconnect after TIMEOUT ---');
    const rejoinChallenge = await DeviceChallengeService.generateChallenge(studentId, device.id, session.id, 'PRESENCE_REJOIN');
    const canonicalPayloadRejoin = buildCanonicalPayload(rejoinChallenge.id, rejoinChallenge.challenge, device.id, studentId, session.id, 'PRESENCE_REJOIN');
    const rejoinSign = crypto.createSign('SHA256');
    rejoinSign.update(canonicalPayloadRejoin);
    const rejoinSignature = rejoinSign.sign({ key: privateKey, format: 'der', type: 'pkcs8' }).toString('base64');
    
    await DeviceChallengeService.verifyChallenge(studentId, rejoinChallenge.id, rejoinSignature);
    const rejoinState = await PresenceService.rejoin(session.id, studentId, device.id);
    console.log('State after Rejoin:', rejoinState);

  } finally {
    // Cleanup
    await prisma.studentDevice.delete({ where: { id: device.id } });
    await prisma.attendanceSession.delete({ where: { id: session.id } });
    console.log('\nTest completed and cleaned up.');
  }
}

runTest();
