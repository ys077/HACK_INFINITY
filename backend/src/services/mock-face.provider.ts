import { FaceVerificationProvider } from './face-verification.provider.js';

export class MockFaceVerificationProvider implements FaceVerificationProvider {
  getProviderId(): string {
    return 'MockFaceProvider_V1';
  }

  validateTemplate(template: any): boolean {
    return template && typeof template.mockId === 'string';
  }

  async compareIdentity(enrolledTemplate: any, verificationTemplate: any): Promise<{ match: boolean; confidence: number }> {
    if (!this.validateTemplate(enrolledTemplate) || !this.validateTemplate(verificationTemplate)) {
      throw new Error('Invalid template format');
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('MOCK PROVIDER CANNOT BE USED IN PRODUCTION');
    }

    const match = enrolledTemplate.mockId === verificationTemplate.mockId;
    return {
      match,
      confidence: match ? 0.99 : 0.05
    };
  }
}
