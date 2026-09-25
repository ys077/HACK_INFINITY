import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
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

  const filtered = classes.filter(c => 
    c.subject.name.toLowerCase().includes(search.toLowerCase()) || 
    c.subject.code.toLowerCase().includes(search.toLowerCase()) ||
    c.faculty.user.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading classes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 mt-1">Manage academic classes and assignments.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Section</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Faculty</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Classroom</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Schedule</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(cls => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{cls.subject.name}</div>
                    <div className="text-sm text-gray-500">{cls.subject.code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cls.section.name} (Year {cls.section.academicYear}, Sem {cls.section.semester})
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{cls.faculty.user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{cls.classroom.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cls.dayOfWeek} {cls.startTime}-{cls.endTime}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      cls.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {cls.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No classes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminClasses;
