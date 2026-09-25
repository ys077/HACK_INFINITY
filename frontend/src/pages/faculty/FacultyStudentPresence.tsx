import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

const FacultyStudentPresence = () => {
  const { sessionId, studentId } = useParams();
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await api.get(`/faculty/sessions/${sessionId}/students/${studentId}/timeline`);
        setTimeline(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [sessionId, studentId]);

  if (loading) return <div className="p-8 animate-pulse">Loading timeline...</div>;
  if (!timeline) return <div className="p-8 text-red-500">Timeline not found.</div>;

  const { student, session, events, verifiedDurationSeconds, status } = timeline;

  const getStatusColor = (s: string) => {
    if (s === 'PRESENT') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'TEMPORARILY_DISCONNECTED') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s === 'ABSENT' || s === 'TIMEOUT') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <Link to={`/faculty/sessions/${sessionId}`} className="inline-flex items-center text-blue-600 hover:underline font-medium text-sm">
        <ArrowLeft size={16} className="mr-1" /> Back to Live Session
      </Link>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student?.name || 'Unknown Student'}</h1>
          <p className="text-gray-500 font-mono mt-1">{student?.studentId || studentId}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 flex items-center"><Clock size={14} className="mr-1" /> Verified Duration</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{Math.round(verifiedDurationSeconds / 60)} min</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 flex items-center"><ShieldCheck size={14} className="mr-1 text-green-600" /> Device Status</p>
            <p className="text-xl font-bold text-green-700 mt-1">VERIFIED</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Presence Timeline</h2>
        
        {events && events.length > 0 ? (
          <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
            {events.map((event: any, idx: number) => (
              <div key={idx} className="relative pl-6">
                <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  event.eventType === 'JOIN' || event.eventType === 'REJOIN' ? 'bg-green-500' :
                  event.eventType === 'TIMEOUT' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-bold text-gray-800">{event.eventType}</h3>
                    <span className="ml-3 text-sm text-gray-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.deviceVerificationId && (
                    <p className="text-xs text-gray-400 mt-1">Via Secure Device Authentication</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500 flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p>No presence events recorded for this session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyStudentPresence;
