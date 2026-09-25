import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Clock, History, LogIn, LogOut, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

const StudentTimeline = () => {
  const { sessionId } = useParams();
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await api.get(`/student/sessions/${sessionId}/timeline`);
        setTimeline(res.data.data);
      } catch (err) {
        console.error("Failed to load timeline", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [sessionId]);

  if (loading) return <div className="flex justify-center mt-12 text-gray-500">Loading timeline...</div>;

  if (!timeline) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Timeline Data</h2>
        <p className="text-gray-500 mb-6">We couldn't find a timeline for this session.</p>
        <Link to="/student/attendance" className="text-blue-600 font-medium">Return to History</Link>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'JOINED': return <LogIn className="w-5 h-5 text-green-600" />;
      case 'REJOINED': return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      case 'LEFT': return <LogOut className="w-5 h-5 text-gray-600" />;
      case 'TIMEOUT': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'JOINED': return 'bg-green-100 border-green-200';
      case 'REJOINED': return 'bg-blue-100 border-blue-200';
      case 'LEFT': return 'bg-gray-100 border-gray-200';
      case 'TIMEOUT': return 'bg-red-100 border-red-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/student/attendance/${sessionId}`} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Presence Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">Detailed chronological view of your attendance events.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
           <div className="flex-1">
             <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Session Duration</div>
             <div className="text-xl font-bold text-gray-900">
               {timeline.session?.startedAt ? (
                 <>
                   {new Date(timeline.session.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                   <span className="text-gray-400 font-normal mx-2">→</span>
                   {timeline.session.endedAt ? new Date(timeline.session.endedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ongoing'}
                 </>
               ) : 'N/A'}
             </div>
           </div>
           <div className="flex-1 text-right">
             <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Verified Presence</div>
             <div className="text-xl font-mono font-bold text-blue-600">
               {Math.floor(timeline.verifiedDurationSeconds / 60)} min
             </div>
           </div>
        </div>

        <div className="relative pl-4 sm:pl-8 border-l-2 border-gray-100 space-y-8 py-4">
          {timeline.events && timeline.events.length > 0 ? (
            timeline.events.map((event: any, index: number) => (
              <div key={index} className="relative flex items-center gap-4 sm:gap-6">
                <div className={cn("absolute left-[-41px] sm:left-[-57px] w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white shadow-sm z-10", getEventBg(event.eventType))}>
                  {getEventIcon(event.eventType)}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex-1 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900 tracking-wide">{event.eventType}</span>
                    <span className="text-sm font-medium text-gray-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.eventType === 'JOINED' && "Initial cryptographic presence verification."}
                    {event.eventType === 'TIMEOUT' && "Grace period expired without verification."}
                    {event.eventType === 'REJOINED' && "Device re-verified and presence restored."}
                    {event.eventType === 'LEFT' && "Presence suspended."}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No presence events recorded for this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTimeline;
