export const CryptoUtils = {
  async generateKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true, // extractable
      ["sign", "verify"]
    );
  },

  async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return this.bufferToBase64(exported);
  },

  async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return this.bufferToBase64(exported);
  },

  async importPrivateKey(base64: string): Promise<CryptoKey> {
    const buffer = this.base64ToBuffer(base64);
    return window.crypto.subtle.importKey(
      "pkcs8",
      buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      true,
      ["sign"]
    );
  },

  async sign(privateKey: CryptoKey, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const signature = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      data
    );
    return this.bufferToBase64(signature);
  },

  bufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  base64ToBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
};
