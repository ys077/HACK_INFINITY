import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { BookOpen, Users, MapPin, Search } from 'lucide-react';

const StudentClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/student/classes');
        setClasses(res.data.data);
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading classes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500 mt-1">View your enrolled courses and schedules.</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search classes..." 
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Enrolled Classes</h3>
          <p className="text-gray-500 mt-1">You are not currently enrolled in any classes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow shadow-sm flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md border border-blue-200 uppercase">
                    {cls.section?.name}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">{cls.section?.course?.name}</h3>
                <div className="text-sm font-medium text-gray-500 mt-1">{cls.section?.course?.code}</div>
              </div>
              <div className="p-5 grow space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{cls.faculty?.name || 'Assigned Faculty'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{cls.classroom?.name}</span>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link
                  to={`/student/classes/${cls.id}`}
                  className="block w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentClasses;
