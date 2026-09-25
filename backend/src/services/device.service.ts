import { prisma } from '../lib/prisma.js';
import { StudentDevice } from '@prisma/client';
import { isValidPublicKey } from '../utils/deviceCrypto.js';

export class DeviceService {
  /**
   * Registers a new device for a student.
   * Rejects if public key is structurally invalid or already registered.
   * Ensures only one ACTIVE device per student by revoking others (safest initial policy).
   */
  static async registerDevice(studentId: string, publicKey: string, deviceName?: string): Promise<StudentDevice> {
    if (!isValidPublicKey(publicKey)) {
      throw new Error('INVALID_PUBLIC_KEY');
    }

    const existingDevice = await prisma.studentDevice.findUnique({
      where: { devicePublicKey: publicKey }
    });

    if (existingDevice) {
      if (existingDevice.studentId !== studentId) {
        throw new Error('DEVICE_ALREADY_REGISTERED');
      }
      if (existingDevice.status === 'ACTIVE') {
        throw new Error('DEVICE_ALREADY_ACTIVE');
      } else {
        throw new Error('DEVICE_REVOKED');
      }
    }

    // Policy: One active device per student. Revoke others safely.
    await prisma.studentDevice.updateMany({
      where: { studentId, status: 'ACTIVE' },
      data: { status: 'REVOKED' }
    });

    return prisma.studentDevice.create({
      data: {
        studentId,
        devicePublicKey: publicKey,
        deviceName: deviceName || 'Unknown Device',
        status: 'ACTIVE'
      }
    });
  }

  /**
   * List all devices for a specific student.
   */
  static async listStudentDevices(studentId: string): Promise<StudentDevice[]> {
    return prisma.studentDevice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get a specific device, ensuring it belongs to the student.
   */
  static async getStudentDevice(studentId: string, deviceId: string): Promise<StudentDevice> {
    const device = await prisma.studentDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device || device.studentId !== studentId) {
      throw new Error('DEVICE_NOT_FOUND');
    }

    return device;
  }

  /**
   * Revoke a specific device.
   */
  static async revokeDevice(studentId: string, deviceId: string): Promise<StudentDevice> {
    const device = await this.getStudentDevice(studentId, deviceId);

    if (device.status === 'REVOKED') {
      throw new Error('DEVICE_ALREADY_REVOKED');
    }

    return prisma.studentDevice.update({
      where: { id: deviceId },
      data: { status: 'REVOKED' }
    });
  }
}
