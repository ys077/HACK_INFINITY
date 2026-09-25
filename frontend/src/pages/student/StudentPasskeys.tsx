import { useEffect, useState } from 'react';
import api from '../../services/api';
import { startRegistration } from '@simplewebauthn/browser';
import { Shield, Key, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

const StudentPasskeys = () => {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPasskeys = async () => {
    try {
      // We don't have a GET /passkeys endpoint yet, but let's mock it for the UI structure or create it.
      // Actually, we should probably add a GET endpoint if we want to list them.
      // Let's assume it exists for now and I will add it to the backend.
      const res = await api.get('/auth/passkeys');
      if (res.data.success) {
        setPasskeys(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load passkeys", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      // 1. Get registration options
      const optionsRes = await api.post('/auth/passkey/register/options');
      const options = optionsRes.data.options;

      // 2. Pass options to authenticator
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Verify with server
      const verificationRes = await api.post('/auth/passkey/register/verify', {
        data: attResp,
        challengeRequestId: options.challenge
      });

      if (verificationRes.data.verified) {
        fetchPasskeys();
      }
    } catch (err: any) {
      console.error("Registration failed", err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to register passkey.');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRevoke = async (credentialId: string) => {
    if (!window.confirm('Are you sure you want to revoke this passkey?')) return;
    
    try {
      await api.post('/auth/passkey/revoke', { credentialId });
      fetchPasskeys();
    } catch (err: any) {
      console.error("Revoke failed", err);
      setError(err.response?.data?.message || 'Failed to revoke passkey.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Checking security credentials...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Passkeys</h1>
        <p className="text-gray-500 mt-1">Manage your secure step-up authentication methods.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-500" /> Registered Passkeys
          </h2>
        </div>
        
        <div className="p-6">
          {passkeys.length > 0 ? (
            <div className="space-y-4">
              {passkeys.map(pk => (
                <div key={pk.id} className="flex justify-between items-center border border-gray-100 p-4 rounded-lg bg-gray-50">
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      Passkey {pk.deviceType === 'singleDevice' ? '(Device-bound)' : '(Synced)'}
                      {pk.status === 'ACTIVE' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Registered: {new Date(pk.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRevoke(pk.credentialId)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Revoke Passkey"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No passkeys registered yet.
            </div>
          )}

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Register a New Passkey</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Use your device's built-in security (Face ID, Touch ID, Windows Hello) for fast, secure step-up authentication.
            </p>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {registering ? 'Setting up...' : 'Register Passkey'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPasskeys;
