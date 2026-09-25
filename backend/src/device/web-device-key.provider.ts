// This uses Node's webcrypto for tests, but in a real browser it would use window.crypto
import crypto from 'crypto';
const webcrypto = crypto.webcrypto as any;

/**
 * Interface representing the key provider abstraction.
 * This can be replaced by a React Native / secure enclave provider later.
 */
export interface DeviceKeyProvider {
  generateKeyPair(): Promise<void>;
  getPublicKey(): Promise<string | null>;
  sign(message: string): Promise<string>;
  delete(): Promise<void>;
}

/**
 * A web-based development key provider.
 * 
 * WARNING: This stores the private key in memory or an insecure development storage mechanism.
 * Do not use this implementation for production mobile clients.
 * Production clients must use Android Keystore or iOS Secure Enclave.
 */
export class WebDeviceKeyProvider implements DeviceKeyProvider {
  private keyPair: CryptoKeyPair | null = null;

  async generateKeyPair(): Promise<void> {
    // Generate Ed25519 key pair (Supported in modern webcrypto and node webcrypto)
    this.keyPair = await webcrypto.subtle.generateKey(
      {
        name: 'Ed25519'
      },
      true, // extractable for dev (in prod secure enclave, false)
      ['sign', 'verify']
    );
  }

  async getPublicKey(): Promise<string | null> {
    if (!this.keyPair) return null;
    
    // Export to SPKI DER
    const spkiBuffer = await webcrypto.subtle.exportKey('spki', this.keyPair.publicKey);
    
    // Convert to base64
    return Buffer.from(spkiBuffer).toString('base64');
  }

  async sign(message: string): Promise<string> {
    if (!this.keyPair) throw new Error('Key pair not generated');

    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const signature = await webcrypto.subtle.sign(
      {
        name: 'Ed25519'
      },
      this.keyPair.privateKey,
      data
    );

    return Buffer.from(signature).toString('base64');
  }

  async delete(): Promise<void> {
    this.keyPair = null;
  }
}
