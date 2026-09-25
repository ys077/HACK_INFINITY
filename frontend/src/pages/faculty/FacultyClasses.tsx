import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { BookOpen, Users, MapPin, Clock } from 'lucide-react';

const FacultyClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/faculty/classes');
        setClasses(res.data.data);
      } catch (err) {
        console.error('Failed to load classes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  if (loading) return <div className="p-8 animate-pulse">Loading classes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">My Classes</h1>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          No classes assigned.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-gray-900">{cls.section?.course?.name}</h3>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                    {cls.section?.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <BookOpen size={16} className="mr-2 text-gray-400" />
                    <span>{cls.section?.course?.code}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    <span>{cls.classroom?.name || cls.classroom}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    <span>{cls.schedule || 'Scheduled'}</span>
                  </div>
                  <div className="flex items-center">
                    <Users size={16} className="mr-2 text-gray-400" />
                    <span>Manage Roster</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 shrink-0 w-full md:w-auto">
                <Link 
                  to={`/faculty/classes/${cls.id}`} 
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-center transition-colors"
                >
                  View Details
                </Link>
                <Link 
                  to={`/faculty/session/start`} 
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-center transition-colors"
                >
                  Start Session
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultyClasses;
