import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import { 
  Users, UserCheck, UserX, Clock, AlertTriangle, 
  Search, ExternalLink, StopCircle, RefreshCw 
} from 'lucide-react';

const FacultyLiveSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchSessionData = async () => {
    try {
      setReconnecting(true);
      const [sessionRes, attendanceRes] = await Promise.all([
        api.get(`/faculty/sessions/${sessionId}`),
        api.get(`/faculty/sessions/${sessionId}/attendance`)
      ]);
      setSession(sessionRes.data.data);
      setAttendance(attendanceRes.data.data.students || []);
    } catch (err) {
      console.error('Failed to fetch session data', err);
    } finally {
      setLoading(false);
      setReconnecting(false);
    }
  };

  useEffect(() => {
    fetchSessionData();

    // Setup Socket.IO
    const token = sessionStorage.getItem('token');
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('session:join', sessionId);
      fetchSessionData(); // Authoritative reload on reconnect
    });

    socket.on('student:joined', (data) => updateStudentStatus(data.studentId, 'PRESENT', data.timestamp));
    socket.on('student:rejoined', (data) => updateStudentStatus(data.studentId, 'PRESENT', data.timestamp));
    socket.on('student:heartbeat', (data) => updateStudentStatus(data.studentId, 'PRESENT', data.timestamp));
    socket.on('student:left', (data) => updateStudentStatus(data.studentId, 'LEFT', data.timestamp));
    socket.on('student:timeout', (data) => updateStudentStatus(data.studentId, 'TIMEOUT', data.timestamp));
    socket.on('student:conflict', () => fetchSessionData()); // Authoritative reload for conflicts
    
    socket.on('session:ended', () => {
      fetchSessionData(); // Refresh to show final state
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const updateStudentStatus = (studentId: string, status: string, lastEventTime: string) => {
    setAttendance(prev => prev.map(record => {
      if (record.studentId === studentId) {
        return { 
          ...record, 
          status,
          events: [...(record.events || []), { eventType: status, timestamp: lastEventTime }] 
        };
      }
      return record;
    }));
  };

  const handleEndSession = async () => {
    try {
      await api.post(`/faculty/sessions/${sessionId}/end`);
      setShowEndModal(false);
      fetchSessionData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to end session');
    }
  };

  if (loading) return <div className="p-8 animate-pulse">Loading live session...</div>;
  if (!session) return <div className="p-8 text-red-500">Session not found.</div>;

  const isEnded = session.status === 'ENDED' || session.status === 'COMPLETED';

  // Calculate stats based on local state
  const presentCount = attendance.filter(a => ['PRESENT', 'TEMPORARILY_DISCONNECTED'].includes(a.status)).length;
  const graceCount = attendance.filter(a => a.status === 'TEMPORARILY_DISCONNECTED').length;
  const absentCount = attendance.length - presentCount;

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{session.class?.section?.course?.name || 'Class'}</h1>
              {isEnded ? (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">ENDED</span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full flex items-center animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600 mr-2"></span> LIVE
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {session.class?.section?.course?.code} ({session.class?.section?.name}) • {session.class?.classroom?.name || 'No Classroom'} • Started {session.startedAt || session.createdAt ? new Date(session.startedAt || session.createdAt).toLocaleTimeString() : 'Unknown'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {reconnecting && (
              <span className="text-sm text-yellow-600 flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                <RefreshCw size={14} className="mr-2 animate-spin" /> Syncing...
              </span>
            )}
            {!isEnded && (
              <button 
                onClick={() => setShowEndModal(true)}
                className="flex items-center px-4 py-2 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                <StopCircle size={18} className="mr-2" />
                End Session
              </button>
            )}
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-gray-900">{attendance.length}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-700 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-700">{presentCount}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700 mb-1">Grace Period</p>
            <p className="text-2xl font-bold text-yellow-700">{graceCount}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-700">{absentCount}</p>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center">
            <Users size={18} className="mr-2 text-gray-500" />
            Live Student Roster
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Student Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Device</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Verified Duration</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendance.map((record) => (
                <tr key={record.studentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{record.name}</div>
                    <div className="text-xs text-gray-500">{record.studentId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">
                      VERIFIED
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {Math.round(record.verifiedDurationSeconds / 60)} min
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/faculty/sessions/${sessionId}/student/${record.studentId}`}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Details <ExternalLink size={14} className="ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendance.length === 0 && (
            <div className="p-12 text-center text-gray-500">No students enrolled in this class.</div>
          )}
        </div>
      </div>

      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-red-600 flex items-center">
                <AlertTriangle className="mr-2" /> End Attendance Session?
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Are you sure you want to end this session? This action will finalize all attendance records and stop accepting new presence verification.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500 text-sm">Present</span>
                  <span className="font-bold text-green-600">{presentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Absent</span>
                  <span className="font-bold text-red-600">{absentCount}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEndSession}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'PRESENT':
      return <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>PRESENT</span>;
    case 'TEMPORARILY_DISCONNECTED':
      return <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200"><span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mr-1.5"></span>GRACE</span>;
    case 'LEFT':
      return <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-300">LEFT</span>;
    case 'TIMEOUT':
      return <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">TIMEOUT</span>;
    case 'ABSENT':
    default:
      return <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold border border-gray-200">ABSENT</span>;
  }
};

export default FacultyLiveSession;
