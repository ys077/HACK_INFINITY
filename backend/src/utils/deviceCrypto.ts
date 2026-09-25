import crypto from 'crypto';

/**
 * Validates whether the given string is a structurally valid SPKI base64 public key.
 */
export function isValidPublicKey(publicKeySpkiBase64: string): boolean {
  try {
    const buffer = Buffer.from(publicKeySpkiBase64, 'base64');
    crypto.createPublicKey({
      key: buffer,
      format: 'der',
      type: 'spki'
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verifies a signature against a given message and public key.
 */
export function verifySignature(publicKeySpkiBase64: string, message: string, signatureBase64: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeySpkiBase64, 'base64'),
      format: 'der',
      type: 'spki'
    });
    
    // For Ed25519, algorithm is null or undefined depending on node version, but node crypto handles it.
    // However, some Node versions require 'ed25519' as algorithm or undefined.
    // Let's pass undefined. If it's RSA/ECDSA, it would need the hash algo. Ed25519 doesn't.
    return crypto.verify(
      undefined,
      Buffer.from(message),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generates a deterministic SHA-256 fingerprint for the public key.
 */
export function generateFingerprint(publicKeySpkiBase64: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(publicKeySpkiBase64, 'base64'));
  const fullHash = hash.digest('hex').toUpperCase();
  return `${fullHash.slice(0, 4)}...${fullHash.slice(-4)}`;
}

/**
 * Builds the canonical payload string to be signed by the client.
 */
export function buildCanonicalPayload(
  challengeId: string,
  challenge: string,
  deviceId: string,
  studentId: string,
  sessionId: string,
  purpose: string
): string {
  return `presence-v1|${challengeId}|${challenge}|${deviceId}|${studentId}|${sessionId}|${purpose}`;
}
