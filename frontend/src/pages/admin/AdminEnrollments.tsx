import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminEnrollments = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/admin/classes');
        setClasses(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setEnrollments([]);
      return;
    }
    const fetchEnrollments = async () => {
      try {
        const res = await api.get(`/admin/classes/${selectedClassId}/enrollments`);
        setEnrollments(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEnrollments();
  }, [selectedClassId]);

  const filteredEnrollments = enrollments.filter(e => 
    e.student.user.name.toLowerCase().includes(search.toLowerCase()) || 
    e.student.studentId.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-gray-500 mt-1">Manage student enrollments for classes.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
        <select 
          className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="">-- Select a Class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.section?.course?.code} - {c.section?.course?.name} (Sec: {c.section.name})
            </option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Enrolled Students ({enrollments.length})
            </h3>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEnrollments.map(enrollment => (
                  <tr key={enrollment.studentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{enrollment.student.studentId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{enrollment.student.user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{enrollment.student.user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        enrollment.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {enrollment.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No students found in this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollments;
