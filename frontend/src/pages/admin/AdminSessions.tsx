import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search, Clock, Users, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

export const AdminSessions = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/admin/sessions');
        setSessions(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const filtered = sessions.filter(s => 
    s.class.subject.name.toLowerCase().includes(search.toLowerCase()) || 
    s.faculty.user.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading sessions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Sessions</h1>
          <p className="text-gray-500 mt-1">Monitor active and historical attendance sessions.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map(session => (
          <div key={session.id} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{session.class.subject.name}</h3>
                <p className="text-sm text-gray-500">{session.class.subject.code} • {session.class.section.name}</p>
              </div>
              <span className={cn(
                "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide",
                session.status === 'IN_PROGRESS' ? "bg-green-100 text-green-700" : 
                session.status === 'COMPLETED' ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"
              )}>
                {session.status}
              </span>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{session.faculty.user.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{session.class.classroom.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Started: {format(new Date(session.startTime), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {session.endTime && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Ended: {format(new Date(session.endTime), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-between items-center">
              <div className="text-sm">
                <span className="text-gray-500">Students: </span>
                <span className="font-semibold text-gray-900">{session._count?.records || 0}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border">
            No sessions found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSessions;
