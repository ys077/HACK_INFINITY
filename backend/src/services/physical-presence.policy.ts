/**
 * Physical presence is a required signal for production attendance.
 * BLE is the intended classroom signal; the web prototype currently uses
 * authorized-device challenge-response instead of claiming BLE detection.
 *
 * BLE alone must never grant attendance. Join is allowed only when:
 *   authorized device + enrollment + active session
 *   AND (web prototype channel XOR verified BLE signal when required)
 */
export type PresenceChannel = 'WEB_DEVICE_CHALLENGE' | 'BLE_BEACON';

export interface PhysicalPresenceInput {
  authorizedDevice: boolean;
  enrolled: boolean;
  sessionActive: boolean;
  /** Server-verified BLE observation only. Client-submitted BLE claims are ignored. */
  verifiedBleSignal?: { beaconId: string; observedAt: Date } | null;
}

export interface PhysicalPresenceDecision {
  allowed: boolean;
  reason?: string;
  channel: PresenceChannel;
  blePhysicalPresence: boolean;
}

export function isBlePresenceRequired(): boolean {
  return process.env.PRESENCE_REQUIRE_BLE === 'true';
}

export function evaluatePhysicalPresence(input: PhysicalPresenceInput): PhysicalPresenceDecision {
  if (!input.sessionActive) {
    return { allowed: false, reason: 'SESSION_NOT_ACTIVE', channel: 'WEB_DEVICE_CHALLENGE', blePhysicalPresence: false };
  }
  if (!input.enrolled) {
    return { allowed: false, reason: 'NOT_ENROLLED', channel: 'WEB_DEVICE_CHALLENGE', blePhysicalPresence: false };
  }
  if (!input.authorizedDevice) {
    return { allowed: false, reason: 'DEVICE_NOT_AUTHORIZED', channel: 'WEB_DEVICE_CHALLENGE', blePhysicalPresence: false };
  }

  const requireBle = isBlePresenceRequired();
  const hasVerifiedBle = Boolean(input.verifiedBleSignal?.beaconId);

  if (requireBle) {
    if (!hasVerifiedBle) {
      return {
        allowed: false,
        reason: 'BLE_SIGNAL_REQUIRED',
        channel: 'BLE_BEACON',
        blePhysicalPresence: false
      };
    }
    return { allowed: true, channel: 'BLE_BEACON', blePhysicalPresence: true };
  }

  // Web prototype: device challenge is the temporary presence channel.
  // Do not record BLE as physically verified until native BLE verification exists.
  return {
    allowed: true,
    channel: 'WEB_DEVICE_CHALLENGE',
    blePhysicalPresence: false
  };
}
