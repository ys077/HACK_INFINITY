import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search, UserCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminAssignments = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, facultyRes] = await Promise.all([
          api.get('/admin/classes'),
          api.get('/admin/faculty?limit=1000') // get all faculty
        ]);
        setClasses(classesRes.data.data || []);
        setFacultyList(facultyRes.data.data?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFacultyChange = async (classId: string, newFacultyId: string) => {
    setUpdatingId(classId);
    try {
      await api.put(`/admin/classes/${classId}`, { facultyId: newFacultyId });
      setClasses(prev => prev.map(c => {
        if (c.id === classId) {
          const newFaculty = facultyList.find(f => f.id === newFacultyId);
          return { ...c, faculty: newFaculty || c.faculty };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to update assignment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.subject.name.toLowerCase().includes(search.toLowerCase()) || 
    c.subject.code.toLowerCase().includes(search.toLowerCase()) ||
    c.faculty.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading assignments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Assignments</h1>
          <p className="text-gray-500 mt-1">Assign and manage faculty for academic classes.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes or faculty..."
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Class (Subject - Section)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Schedule</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Current Faculty</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Assign Faculty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{cls.subject.name}</div>
                    <div className="text-sm text-gray-500">{cls.subject.code} - {cls.section.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cls.dayOfWeek} {cls.startTime}-{cls.endTime}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">{cls.faculty.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className={cn(
                        "w-full p-2 text-sm border border-gray-300 rounded-lg outline-none transition-colors",
                        updatingId === cls.id ? "opacity-50 cursor-not-allowed" : "focus:ring-2 focus:ring-purple-600"
                      )}
                      value={cls.faculty.id}
                      onChange={(e) => handleFacultyChange(cls.id, e.target.value)}
                      disabled={updatingId === cls.id}
                    >
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.employeeId})</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredClasses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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

export default AdminAssignments;
