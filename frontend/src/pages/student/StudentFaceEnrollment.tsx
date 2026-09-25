import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../../services/api';
import { FaceLivenessCamera } from '../../components/FaceLivenessCamera';
import { Shield, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentFaceEnrollment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'IDLE' | 'VERIFYING_PASSKEY' | 'CAMERA' | 'SUCCESS'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [stepUpSessionId, setStepUpSessionId] = useState<string | null>(null);

  const handleStartPasskey = async () => {
    setStep('VERIFYING_PASSKEY');
    setError(null);
    try {
      const optionsRes = await api.post('/auth/passkey/auth/options');
      const options = optionsRes.data.options;
      const authResp = await startAuthentication({ optionsJSON: options });
      const verifyRes = await api.post('/auth/passkey/auth/verify', {
        data: authResp,
        challengeRequestId: options.challenge
      });

      if (verifyRes.data.verified && verifyRes.data.stepUpSessionId) {
        setStepUpSessionId(verifyRes.data.stepUpSessionId);
        setStep('CAMERA');
      } else {
        throw new Error('Verification failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Passkey verification failed.');
      setStep('IDLE');
    }
  };

  const handleFaceSuccess = async (embedding: number[]) => {
    try {
      await api.post('/face/enrollment', {
        stepUpSessionId,
        template: embedding
      });
      setStep('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to enroll face.');
      setStep('IDLE');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/dashboard" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Face Enrollment</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {step === 'IDLE' && (
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Secure Your Identity</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Before attending secure sessions, you must enroll your face for identity verification. This process requires your registered passkey.
            </p>
            <button
              onClick={handleStartPasskey}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Passkey Verification
            </button>
          </div>
        )}

        {step === 'VERIFYING_PASSKEY' && (
          <div className="text-center py-12 animate-pulse">
            <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-blue-700">Verifying Identity...</h2>
            <p className="text-gray-500">Please complete the passkey prompt.</p>
          </div>
        )}

        {step === 'CAMERA' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Scan Your Face</h2>
              <p className="text-gray-600">Ensure your face is clearly visible in the frame.</p>
            </div>
            <FaceLivenessCamera 
              mode="enrollment"
              onSuccess={handleFaceSuccess}
              onFailure={(msg) => { setError(msg); setStep('IDLE'); }}
            />
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Enrollment Complete</h2>
            <p className="text-gray-600 mb-8">Your face identity has been securely registered.</p>
            <Link
              to="/student/dashboard"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFaceEnrollment;
