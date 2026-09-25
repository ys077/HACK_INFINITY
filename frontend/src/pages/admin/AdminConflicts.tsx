import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search, AlertTriangle, User, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

export const AdminConflicts = () => {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        const res = await api.get('/admin/conflicts');
        setConflicts(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConflicts();
  }, []);

  const filtered = conflicts.filter(c => 
    c.student.user.name.toLowerCase().includes(search.toLowerCase()) || 
    c.type.toLowerCase().includes(search.toLowerCase()) ||
    c.session.class.subject.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading conflicts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Conflicts</h1>
          <p className="text-gray-500 mt-1">Review and manage system-detected attendance anomalies.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conflicts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.map(conflict => (
          <div key={conflict.id} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    conflict.severity === 'HIGH' ? 'bg-red-100 text-red-600' :
                    conflict.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  )}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{conflict.type.replace(/_/g, ' ')}</h3>
                    <p className="text-sm text-gray-500">Detected on {format(new Date(conflict.detectedAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide",
                  conflict.resolvedAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                  {conflict.resolvedAt ? 'RESOLVED' : 'PENDING'}
                </span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                {conflict.description}
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{conflict.student.user.name}</p>
                    <p className="text-xs text-gray-500">{conflict.student.studentId}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{conflict.session.class.subject.name}</p>
                    <p className="text-xs text-gray-500">Session ID: {conflict.session.id.substring(0,8)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border">
            No conflicts found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConflicts;
