import { FaceVerificationProvider } from './face-verification.provider.js';

function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) throw new Error('Arrays must have the same length');
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export class FaceApiProvider implements FaceVerificationProvider {
  // face-api.js usually recommends a distance threshold around 0.6 for euclidean distance of 128d descriptors
  private readonly DISTANCE_THRESHOLD = 0.55; 

  getProviderId(): string {
    return 'FaceApi_Browser_V1';
  }

  validateTemplate(template: any): boolean {
    return Array.isArray(template) && template.length === 128 && typeof template[0] === 'number';
  }

  async compareIdentity(enrolledTemplate: number[], verificationTemplate: number[]): Promise<{ match: boolean; confidence: number }> {
    if (!this.validateTemplate(enrolledTemplate) || !this.validateTemplate(verificationTemplate)) {
      throw new Error('Invalid template format. Expected 128-d number array.');
    }

    const distance = euclideanDistance(enrolledTemplate, verificationTemplate);
    const match = distance < this.DISTANCE_THRESHOLD;
    
    // Convert distance to a pseudo-confidence score (0 to 1)
    // distance 0 -> 1.0 confidence
    // distance >= 1.0 -> 0.0 confidence
    const confidence = Math.max(0, 1 - distance);

    return { match, confidence };
  }
}
