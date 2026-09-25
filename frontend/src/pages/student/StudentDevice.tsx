import { useEffect, useState } from 'react';
import api from '../../services/api';
import { CryptoUtils } from '../../utils/crypto';
import { Smartphone, Shield, Key, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

const StudentDevice = () => {
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = async () => {
    try {
      const res = await api.get('/student/devices');
      if (res.data.data && res.data.data.length > 0) {
        setDevice(res.data.data[0]);
      } else {
        setDevice(null);
      }
    } catch (err) {
      console.error("Failed to load device", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevice();
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      // 1. Generate local keypair
      const keyPair = await CryptoUtils.generateKeyPair();
      
      // 2. Export keys
      const publicKeySpki = await CryptoUtils.exportPublicKey(keyPair.publicKey);
      const privateKeyPkcs8 = await CryptoUtils.exportPrivateKey(keyPair.privateKey);
      
      // 3. Register with backend
      // Provide a device name and the base64 public key
      const deviceInfo = window.navigator.userAgent;
      const res = await api.post('/student/devices/register', {
        deviceName: `Browser (${deviceInfo.split(' ')[0]})`,
        publicKey: publicKeySpki
      });
      
      if (res.data.success) {
        // 4. Save private key locally ONLY if successful registration
        localStorage.setItem(`device_private_key_${res.data.data.id}`, privateKeyPkcs8);
        localStorage.setItem('active_device_id', res.data.data.id);
        setDevice(res.data.data);
      }
    } catch (err: any) {
      console.error("Registration failed", err);
      setError(err.response?.data?.message || 'Failed to register device.');
    } finally {
      setRegistering(false);
    }
  };

  const handleRevoke = async () => {
    if (!device) return;
    if (!window.confirm('Are you sure you want to revoke this device? You will not be able to join attendance sessions until you register a new one.')) return;
    
    setRevoking(true);
    try {
      await api.post(`/student/devices/${device.id}/revoke`);
      localStorage.removeItem(`device_private_key_${device.id}`);
      localStorage.removeItem('active_device_id');
      setDevice(null);
    } catch (err: any) {
      console.error("Revoke failed", err);
      setError(err.response?.data?.message || 'Failed to revoke device.');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Checking device status...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Authorized Device</h1>
        <p className="text-gray-500 mt-1">Manage the device used for your cryptographically secure attendance verification.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {device ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gray-500" /> Current Device
            </h2>
            {device.status === 'ACTIVE' ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> ACTIVE
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> REVOKED
              </span>
            )}
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Device ID</div>
                <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 text-gray-800 break-all">
                  {device.id}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Device Name</div>
                <div className="text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 text-gray-800">
                  {device.deviceName}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-gray-500 mb-1">Cryptographic Fingerprint (SHA-256)</div>
                <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 text-gray-800 flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-400" />
                  {device.publicKeyFingerprint}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Registered on: {new Date(device.registeredAt).toLocaleDateString()}
              </div>
              <button 
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {revoking ? 'Revoking...' : 'Revoke Device'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Device Registration</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            This device will be linked to your student account. The device is used to establish your authorized identity during attendance.
          </p>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {registering ? 'Generating Keys & Registering...' : 'Register This Device'}
          </button>
          <div className="mt-6 text-xs text-gray-400 max-w-md mx-auto">
            A cryptographic key pair will be securely generated on this device. The private key never leaves your browser.
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDevice;
