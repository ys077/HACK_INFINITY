import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface FaceLivenessCameraProps {
  onSuccess: (embedding: number[], observedActions: string[], actionTimestamps: number[]) => void;
  onFailure: (reason: string) => void;
  challengeSequence?: string[]; // null for enrollment
  mode: 'enrollment' | 'verification';
}

export const FaceLivenessCamera: React.FC<FaceLivenessCameraProps> = ({ onSuccess, onFailure, challengeSequence, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState<string>('Loading models...');
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [observedActions, setObservedActions] = useState<string[]>([]);
  const [actionTimestamps, setActionTimestamps] = useState<number[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  // Load models from CDN
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        setStatus('Starting camera...');
      } catch (err) {
        console.error("Failed to load models:", err);
        onFailure('Failed to load face detection models.');
      }
    };
    loadModels();
  }, [onFailure]);

  // Start Camera
  useEffect(() => {
    if (!modelsLoaded) return;
    
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          setStatus(mode === 'enrollment' ? 'Look directly at the camera to enroll.' : 'Center your face.');
        }
      } catch (err) {
        onFailure('Camera permission denied or not available.');
      }
    };
    
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [modelsLoaded, onFailure, mode]);

  // Frame processing loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;
    
    let isProcessing = false;
    let animationFrameId: number;
    let successfulEmbedding: Float32Array | null = null;

    // Helper to evaluate basic liveness actions based on landmarks
    const evaluateLivenessAction = (landmarks: faceapi.FaceLandmarks68, action: string): boolean => {
      // Basic heuristics for demo purposes
      const jawOutline = landmarks.getJawOutline();
      const nose = landmarks.getNose();
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      // Horizontal head turn heuristic: compare nose distance to jaw left vs right
      const noseX = nose[0].x;
      const leftJawX = jawOutline[0].x;
      const rightJawX = jawOutline[16].x;
      const leftDist = noseX - leftJawX;
      const rightDist = rightJawX - noseX;

      if (action === 'TURN_HEAD_LEFT' && leftDist < rightDist * 0.6) return true; // looking left (from their perspective)
      if (action === 'TURN_HEAD_RIGHT' && rightDist < leftDist * 0.6) return true;
      if (action === 'LOOK_LEFT' && leftDist < rightDist * 0.6) return true;
      if (action === 'LOOK_RIGHT' && rightDist < leftDist * 0.6) return true;
      
      // Blink heuristic: Distance between top and bottom eyelids
      const eyeOpenness = (eye: faceapi.Point[]) => {
        return Math.abs(eye[1].y - eye[5].y) + Math.abs(eye[2].y - eye[4].y);
      };
      if (action === 'BLINK_ONCE' || action === 'BLINK_TWICE') {
        const leftOpen = eyeOpenness(leftEye);
        const rightOpen = eyeOpenness(rightEye);
        // Very simplistic thresholding
        if (leftOpen < 5 && rightOpen < 5) return true; 
      }
      
      if (action === 'SMILE') return true; // Mock: require actual expression model for robust smile
      if (action === 'OPEN_MOUTH') return true; // Mock

      return false;
    };

    const processFrame = async () => {
      if (isProcessing || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      isProcessing = true;

      try {
        const video = videoRef.current;
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
          setStatus('No face detected.');
          isProcessing = false;
          animationFrameId = requestAnimationFrame(processFrame);
          return;
        }

        // Draw overlay
        if (canvasRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, video, true);
          const resizedResult = faceapi.resizeResults(detection, dims);
          faceapi.draw.drawDetections(canvasRef.current, resizedResult);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedResult);
        }

        if (mode === 'enrollment') {
          // Immediately success for enrollment
          setStatus('Face successfully captured.');
          onSuccess(Array.from(detection.descriptor), [], []);
          return; // Stop loop
        }

        // Verification Mode
        if (challengeSequence && currentChallengeIndex < challengeSequence.length) {
          const currentAction = challengeSequence[currentChallengeIndex];
          setStatus(`Challenge: ${currentAction.replace(/_/g, ' ')}`);

          const actionPassed = evaluateLivenessAction(detection.landmarks, currentAction);
          if (actionPassed) {
            setObservedActions(prev => [...prev, currentAction]);
            setActionTimestamps(prev => [...prev, Date.now()]);
            setCurrentChallengeIndex(prev => prev + 1);
            
            // Capture embedding on the first successful challenge action
            if (!successfulEmbedding) {
              successfulEmbedding = detection.descriptor;
            }
          }
        } else if (challengeSequence && currentChallengeIndex >= challengeSequence.length) {
          setStatus('Identity verified.');
          onSuccess(
            Array.from(successfulEmbedding || detection.descriptor), 
            [...observedActions], 
            [...actionTimestamps]
          );
          return; // Stop loop
        }

      } catch (err) {
        console.error("Frame processing error:", err);
      }

      isProcessing = false;
      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, modelsLoaded, mode, challengeSequence, currentChallengeIndex, observedActions, actionTimestamps, onSuccess]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden aspect-video">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full object-cover z-10 transform scale-x-[-1]" 
        />
      </div>
      <div className="w-full max-w-md p-4 bg-gray-100 rounded-lg text-center shadow-inner">
        <p className="text-lg font-semibold text-gray-800 animate-pulse">{status}</p>
        {mode === 'verification' && challengeSequence && (
          <div className="mt-2 text-sm text-gray-500">
            Progress: {currentChallengeIndex} / {challengeSequence.length}
          </div>
        )}
      </div>
    </div>
  );
};
