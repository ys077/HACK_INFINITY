import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';
import { CryptoUtils } from '../../utils/crypto';
import { cn } from '../../utils/cn';
import { 
  CheckCircle, AlertTriangle, XCircle, Clock, 
  Smartphone, Shield, Radio, ArrowLeft
} from 'lucide-react';

const StudentLiveSession = () => {
  const params = useParams();
  const navigate = useNavigate();
  
  const [sessionId, setSessionId] = useState<string | undefined>(params.id || params.sessionId);
  const [session, setSession] = useState<any>(null);
  const [presenceState, setPresenceState] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [verifiedSeconds, setVerifiedSeconds] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  const fetchState = async () => {
    try {
      // 1. Fetch Session
      const sessionRes = await api.get(`/student/sessions/active`);
      const activeSessions = sessionRes.data.data;
      
      let targetSessionId = sessionId;
      if (!targetSessionId) {
        if (activeSessions.length > 0) {
          targetSessionId = activeSessions[0].id;
          setSessionId(targetSessionId);
          navigate(`/student/sessions/${targetSessionId}`, { replace: true });
        } else {
          setLoading(false);
          return;
        }
      }

      const activeSession = activeSessions.find((s: any) => s.id === targetSessionId);
      if (activeSession) {
        setSession(activeSession);
      } else {
        // Fallback: check if it ended
        const historyRes = await api.get('/student/sessions/history');
        const pastSession = historyRes.data.data?.sessions?.find((s: any) => s.sessionId === targetSessionId);
        if (pastSession) {
          navigate(`/student/attendance/${targetSessionId}`);
          return;
        }
      }

      // 2. Fetch Device
      const deviceRes: any = await api.get('/student/devices').catch(() => null);
      let currentDevice = null;
      if (deviceRes && deviceRes.data && deviceRes.data.data && deviceRes.data.data.length > 0) {
        currentDevice = deviceRes.data.data[0];
        setDevice(currentDevice);
      }

      // 3. Fetch Presence Status
      const statusRes = await api.get(`/presence/${targetSessionId}/status`);
      setPresenceState(statusRes.data.data);
      
      // Also fetch verified seconds from attendance API if available
      const attRes = await api.get(`/student/sessions/${targetSessionId}/attendance`).catch(() => null);
      if (attRes?.data?.data?.verifiedSeconds !== undefined) {
        setVerifiedSeconds(attRes.data.data.verifiedSeconds);
      }

    } catch (err: any) {
      if (err.response?.status === 404) {
        navigate('/student/dashboard');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();

    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      fetchState(); // Re-fetch authoritative state on reconnect
      socket.emit('subscribe', `attendance-session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen to presence events
    socket.on('student:joined', () => fetchState());
    socket.on('student:rejoined', () => fetchState());
    socket.on('student:left', () => fetchState());
    socket.on('student:timeout', () => fetchState());
    socket.on('student:heartbeat', () => fetchState());
    socket.on('student:session-ended', () => {
      navigate(`/student/attendance/${sessionId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, navigate]);

  const handleJoin = async () => {
    if (!device) {
      setError("No registered device found. Please register a device first.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const privateKeyStr = localStorage.getItem(`device_private_key_${device.id}`);
      if (!privateKeyStr) {
        throw new Error("Local private key not found. Please re-register your device.");
      }

      const isRejoin = presenceState?.status === 'TIMEOUT' || presenceState?.status === 'LEFT';
      const purpose = isRejoin ? 'PRESENCE_REJOIN' : 'PRESENCE_JOIN';

      // 1. Request Challenge
      const challengeRes = await api.post('/device/challenge', {
        deviceId: device.id,
        sessionId,
        purpose
      });
      const { challengeId, challenge, canonicalPayload } = challengeRes.data.data;

      // 2. Sign Challenge
      const privateKey = await CryptoUtils.importPrivateKey(privateKeyStr);
      const signature = await CryptoUtils.sign(privateKey, canonicalPayload);

      // 3. Verify Challenge
      await api.post('/device/verify', {
        challengeId,
        signature
      });

      // 4. Join / Rejoin
      if (isRejoin) {
        await api.post('/presence/rejoin', { sessionId, deviceId: device.id });
      } else {
        await api.post('/presence/join', { sessionId, deviceId: device.id });
      }

      await fetchState();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to verify device and join.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading live session...</div>;
  if (!sessionId || !session) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
      <Radio className="w-12 h-12 text-gray-300" />
      <p className="text-lg font-medium">No Active Sessions Right Now</p>
      <p className="text-sm">When a faculty member starts a class, it will appear here.</p>
    </div>
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Determine Primary Status Component
  const renderStatus = () => {
    if (verifying) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center animate-pulse">
          <Shield className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-blue-700">Verifying Device...</h2>
          <p className="text-blue-600 mt-2">Performing cryptographic challenge-response.</p>
        </div>
      );
    }

    switch (presenceState?.status) {
      case 'PRESENT':
        return (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 uppercase tracking-wide">Presence Verified</h2>
            <p className="text-green-600 font-medium mt-2">Your attendance is currently active.</p>
            
            <div className="mt-8 pt-6 border-t border-green-200/50 flex flex-col items-center">
              <div className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-1">Verified Duration</div>
              <div className="text-4xl font-mono font-bold text-green-800">{formatTime(verifiedSeconds)}</div>
            </div>
          </div>
        );
      case 'GRACE':
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-orange-700 uppercase tracking-wide">Presence Temporarily Lost</h2>
            <p className="text-orange-600 font-medium mt-2 max-w-sm mx-auto">
              We cannot currently verify your physical classroom presence.
            </p>
            
            <div className="mt-6 pt-6 border-t border-orange-200 flex flex-col items-center">
              <div className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-1">Grace Period</div>
              <div className="text-3xl font-mono font-bold text-orange-700 flex items-center gap-2">
                <Clock className="w-6 h-6" /> ACTIVE
              </div>
              <p className="text-xs text-orange-500 mt-3 font-medium">
                The system will automatically restore attendance when presence is verified again.
              </p>
            </div>
          </div>
        );
      case 'TIMEOUT':
      case 'LEFT':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-700 uppercase tracking-wide">Presence Timeout</h2>
            <p className="text-red-600 font-medium mt-2">Your classroom presence could not be verified.</p>
            
            <div className="mt-8 pt-6 border-t border-red-200 flex flex-col items-center gap-4">
               <button 
                onClick={handleJoin}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Re-verify Presence
              </button>
            </div>
          </div>
        );
      default:
        // Not Joined Yet
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Attendance Session Active</h2>
            <p className="text-gray-500 font-medium mt-2">You have not joined this session yet.</p>
            
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
              <button 
                onClick={handleJoin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Join Securely
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/dashboard" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{session.class?.section?.course?.name}</h1>
          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <span>{session.class?.section?.name}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              LIVE
            </span>
          </div>
        </div>
      </div>

      {!socketConnected && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Connection lost. Attempting to reconnect...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {renderStatus()}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Session Details</h3>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Device</span>
          {device ? (
             <span className="font-medium text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Authorized</span>
          ) : (
            <span className="font-medium text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Not Registered</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Cryptographic Identity</span>
           <span className={cn("font-medium", presenceState?.status === 'PRESENT' ? "text-green-600" : "text-gray-400")}>
             {presenceState?.status === 'PRESENT' ? '✓ Verified' : 'Pending'}
           </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Session Started</span>
           <span className="font-medium text-gray-900">
             {session.startedAt ? new Date(session.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
           </span>
        </div>
      </div>
      
      <div className="flex justify-center pt-2">
        <Link 
          to={`/student/timeline/${sessionId}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-white border border-gray-200 hover:border-blue-200 px-6 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          View Session Timeline
        </Link>
      </div>

    </div>
  );
};

export default StudentLiveSession;
