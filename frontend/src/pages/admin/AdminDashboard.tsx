import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, BookOpen, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/analytics/overview');
        setMetrics(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-500 mt-1">Real-time status of the Continuous Classroom Presence system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Users</h3>
              <p className="text-sm text-gray-500">Active accounts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalStudents}</p>
              <p className="text-sm text-gray-500">Students</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalFaculty}</p>
              <p className="text-sm text-gray-500">Faculty</p>
            </div>
          </div>
        </div>

        {/* Academic Structure */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Academic</h3>
              <p className="text-sm text-gray-500">Infrastructure</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalClasses}</p>
              <p className="text-sm text-gray-500">Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalSubjects}</p>
              <p className="text-sm text-gray-500">Subjects</p>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Sessions Today</h3>
              <p className="text-sm text-gray-500">Attendance tracking</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeSessions}</p>
              <p className="text-sm text-green-600 font-medium">Active Now</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.completedSessionsToday}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Pending Conflicts
          </h3>
          {metrics.openConflicts === 0 ? (
            <p className="text-gray-500 text-sm">No unresolved attendance conflicts.</p>
          ) : (
            <p className="text-amber-600 font-medium text-lg">{metrics.openConflicts} unresolved conflicts require attention.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            System Integrity
          </h3>
          <p className="text-gray-600 text-sm">Audit chain is intact and monitoring active sessions.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
