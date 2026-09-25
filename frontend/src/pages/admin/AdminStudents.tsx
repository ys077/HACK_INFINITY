import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    departmentId: '',
    courseId: '',
    sectionId: '',
    year: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    const fetchAcademic = async () => {
      try {
        const [deptRes, courseRes, sectionRes] = await Promise.all([
          api.get('/admin/departments'),
          api.get('/admin/courses'),
          api.get('/admin/sections')
        ]);
        setDepartments(deptRes.data.data || []);
        setCourses(courseRes.data.data || []);
        setSections(sectionRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAcademic();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/students', { ...formData, year: parseInt(String(formData.year)) });
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', studentId: '', departmentId: '', courseId: '', sectionId: '', year: 1 });
      await fetchStudents();
    } catch (err) {
      console.error(err);
      alert('Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDeptCourses = courses.filter(c => !formData.departmentId || c.departmentId === formData.departmentId);
  const filteredSections = sections.filter(s => !formData.courseId || s.courseId === formData.courseId);

  const filtered = students.filter(s => {
    const matchSearch = (s.name && s.name.toLowerCase().includes(search.toLowerCase())) || 
                        (s.studentId && s.studentId.toLowerCase().includes(search.toLowerCase()));
    const matchDept = !selectedDept || s.departmentId === selectedDept;
    const matchCourse = !selectedCourse || s.courseId === selectedCourse;
    const matchSection = !selectedSection || s.sectionId === selectedSection;
    return matchSearch && matchDept && matchCourse && matchSection;
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading students...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">Manage student accounts and records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedCourse(''); setSelectedSection(''); }} className="px-3 py-2 border rounded-lg outline-none text-sm bg-white">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedSection(''); }} disabled={!selectedDept} className="px-3 py-2 border rounded-lg outline-none text-sm bg-white disabled:opacity-50">
            <option value="">All Courses</option>
            {courses.filter(c => c.departmentId === selectedDept).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedCourse} className="px-3 py-2 border rounded-lg outline-none text-sm bg-white disabled:opacity-50">
            <option value="">All Sections</option>
            {sections.filter(s => s.courseId === selectedCourse).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap"
          >
            + Add Student
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Student ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Department</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{student.user?.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{student.studentId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{student.department?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      student.user?.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {student.user?.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No students found.
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
              <h2 className="text-lg font-semibold text-gray-900">Add Student</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input required type="text" value={formData.studentId} onChange={e => setFormData({ ...formData, studentId: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select required value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value, courseId: '', sectionId: '' })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select required value={formData.courseId} onChange={e => setFormData({ ...formData, courseId: e.target.value, sectionId: '' })} disabled={!formData.departmentId} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50">
                  <option value="">Select Course</option>
                  {filteredDeptCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select required value={formData.sectionId} onChange={e => setFormData({ ...formData, sectionId: e.target.value })} disabled={!formData.courseId} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50">
                  <option value="">Select Section</option>
                  {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select required value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-600">
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
