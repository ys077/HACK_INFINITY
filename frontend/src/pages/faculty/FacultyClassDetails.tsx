import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Play, Users, BookOpen } from 'lucide-react';

const FacultyClassDetails = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await api.get(`/faculty/classes/${classId}`);
        setCls(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClass();
  }, [classId]);

  const handleStartSession = async () => {
    try {
      const res = await api.post('/faculty/sessions', {
        classId,
        durationMinutes: duration
      });
      navigate(`/faculty/sessions/${res.data.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start session');
    }
  };

  if (loading) return <div className="p-8 animate-pulse">Loading class details...</div>;
  if (!cls) return <div className="p-8 text-red-500">Class not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{cls.subject.name}</h1>
          <p className="text-gray-500 mt-1">{cls.subject.code} • {cls.course} ({cls.section})</p>
        </div>
        <button 
          onClick={() => setShowStartModal(true)}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play size={20} className="mr-2" />
          Start Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <BookOpen size={24} className="text-gray-400 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Classroom</p>
            <p className="font-semibold text-gray-900">{cls.classroom}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <Clock size={24} className="text-gray-400 mr-4" />
          <div>
            <p className="text-sm text-gray-500">Schedule</p>
            <p className="font-semibold text-gray-900">{cls.schedule}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <Users size={24} className="text-gray-400 mr-4" />
            <div>
              <p className="text-sm text-gray-500">Students</p>
              <p className="font-semibold text-gray-900">{cls.enrollments?.length || 0}</p>
            </div>
          </div>
          <Link to={`/faculty/classes/${classId}/students`} className="text-blue-600 text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
      </div>

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Start Attendance Session?</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">{cls.subject.name}</p>
                <p className="text-sm text-gray-600">{cls.course} ({cls.section}) • {cls.classroom}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Duration (minutes)
                </label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  min="5" max="240"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartSession}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Local component since I forgot to import it
const Clock = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default FacultyClassDetails;
