export interface FaceVerificationProvider {
  /**
   * Compare two face embeddings/templates and return a confidence score
   * and a boolean indicating if they match.
   */
  compareIdentity(enrolledTemplate: any, verificationTemplate: any): Promise<{ match: boolean; confidence: number }>;

  /**
   * The name/identifier of this provider (e.g. "MockFaceProvider", "FaceApiV1")
   */
  getProviderId(): string;

  /**
   * Validates if the template format is valid for this provider.
   */
  validateTemplate(template: any): boolean;
}
