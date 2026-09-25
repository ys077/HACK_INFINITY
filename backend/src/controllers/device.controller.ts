import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { DeviceService } from '../services/device.service.js';
import { generateFingerprint } from '../utils/deviceCrypto.js';
import { z } from 'zod';
import { AuditService } from '../services/audit.service.js';

const registerDeviceSchema = z.object({
  publicKey: z.string().min(10, "Public key must be provided"),
  deviceName: z.string().max(100).optional()
});

export const registerDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = registerDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid request data' });
      return;
    }

    const { publicKey, deviceName } = parsed.data;

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const device = await DeviceService.registerDevice(student.id, publicKey, deviceName);

    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'DEVICE_REGISTERED',
      entityType: 'StudentDevice',
      entityId: device.id,
      metadata: { deviceName: device.deviceName, fingerprint: generateFingerprint(device.devicePublicKey) }
    });

    res.status(201).json({
      success: true,
      data: {
        id: device.id,
        deviceName: device.deviceName,
        status: device.status,
        fingerprint: generateFingerprint(device.devicePublicKey),
        createdAt: device.createdAt
      }
    });
  } catch (error: any) {
    const msg = error.message;
    if (['INVALID_PUBLIC_KEY', 'DEVICE_ALREADY_REGISTERED', 'DEVICE_ALREADY_ACTIVE', 'DEVICE_REVOKED'].includes(msg)) {
      res.status(400).json({ success: false, message: msg });
    } else {
      console.error('registerDevice Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};

export const listDevices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const devices = await DeviceService.listStudentDevices(student.id);

    res.json({
      success: true,
      data: devices.map(d => ({
        id: d.id,
        deviceName: d.deviceName,
        status: d.status,
        fingerprint: generateFingerprint(d.devicePublicKey),
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt
      }))
    });
  } catch (error) {
    console.error('listDevices Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getDeviceDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const device = await DeviceService.getStudentDevice(student.id, deviceId);

    res.json({
      success: true,
      data: {
        id: device.id,
        deviceName: device.deviceName,
        status: device.status,
        fingerprint: generateFingerprint(device.devicePublicKey),
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        lastSeenAt: device.lastSeenAt
      }
    });
  } catch (error: any) {
    if (error.message === 'DEVICE_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'DEVICE_NOT_FOUND' });
    } else {
      console.error('getDeviceDetails Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};

export const revokeDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(403).json({ success: false, message: 'STUDENT_PROFILE_REQUIRED' });
      return;
    }

    const device = await DeviceService.revokeDevice(student.id, deviceId);

    await AuditService.createAuditLog({
      actorId: req.user!.id,
      action: 'DEVICE_REVOKED',
      entityType: 'StudentDevice',
      entityId: device.id,
      metadata: { deviceName: device.deviceName }
    });

    res.json({
      success: true,
      data: {
        id: device.id,
        status: device.status,
        updatedAt: device.updatedAt
      }
    });
  } catch (error: any) {
    if (error.message === 'DEVICE_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'DEVICE_NOT_FOUND' });
    } else if (error.message === 'DEVICE_ALREADY_REVOKED') {
      res.status(400).json({ success: false, message: 'DEVICE_ALREADY_REVOKED' });
    } else {
      console.error('revokeDevice Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};

// Admin visibility
export const getStudentDevicesForAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const devices = await DeviceService.listStudentDevices(studentId);

    res.json({
      success: true,
      data: devices.map(d => ({
        id: d.id,
        studentId: d.studentId,
        deviceName: d.deviceName,
        status: d.status,
        fingerprint: generateFingerprint(d.devicePublicKey),
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt
      }))
    });
  } catch (error) {
    console.error('getStudentDevicesForAdmin Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
