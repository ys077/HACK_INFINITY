import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminFaculty = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: '',
    courseId: '',
    employeeId: '',
    phone: '',
    status: 'ACTIVE'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/admin/faculty');
      setFaculty(res.data.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
    const fetchDepartmentsAndCourses = async () => {
      try {
        const [deptRes, courseRes] = await Promise.all([
          api.get('/admin/departments'),
          api.get('/admin/courses')
        ]);
        setDepartments(deptRes.data.data || []);
        setCourses(courseRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepartmentsAndCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/faculty', formData);
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', departmentId: '', courseId: '', employeeId: '', phone: '', status: 'ACTIVE' });
      await fetchFaculty();
    } catch (err) {
      console.error(err);
      alert('Failed to create faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = faculty.filter(f => {
    const matchSearch = (f.name && f.name.toLowerCase().includes(search.toLowerCase())) || 
                        (f.employeeId && f.employeeId.toLowerCase().includes(search.toLowerCase()));
    const matchDept = !selectedDept || f.departmentId === selectedDept;
    return matchSearch && matchDept;
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading faculty...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty</h1>
          <p className="text-gray-500 mt-1">Manage faculty accounts and assignments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="px-3 py-2 border rounded-lg outline-none text-sm bg-white">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap"
          >
            + Create Faculty
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Faculty</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Employee ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Department</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Course</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(fac => (
                <tr key={fac.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{fac.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{fac.user?.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{fac.employeeId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{fac.department?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{fac.course?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      fac.user?.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {fac.user?.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No faculty found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Create Faculty Account</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input required type="text" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select required value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value, courseId: '' })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select required value={formData.courseId} onChange={e => setFormData({ ...formData, courseId: e.target.value })} disabled={!formData.departmentId} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50">
                  <option value="">Select Course</option>
                  {courses.filter(c => c.departmentId === formData.departmentId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaculty;
