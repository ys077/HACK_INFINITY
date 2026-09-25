import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Search } from 'lucide-react';

const FacultyStudents = () => {
  const { classId } = useParams();
  const [students, setStudents] = useState<any[]>([]);
  const [cls, setCls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/faculty/classes/${classId}`);
        setStudents(res.data.data.enrollments || []);
        setCls(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [classId]);

  if (loading) return <div className="p-8 animate-pulse">Loading students...</div>;

  const filteredStudents = students.filter(enr => 
    enr.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enr.student?.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Link to={`/faculty/classes/${classId}`} className="inline-flex items-center text-blue-600 hover:underline font-medium text-sm">
        <ArrowLeft size={16} className="mr-1" /> Back to Class
      </Link>

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrolled Students</h1>
          {cls && <p className="text-gray-500 mt-1">{cls.section?.course?.name} ({cls.section?.name})</p>}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search student name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Student ID</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Email</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Device Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((enr) => (
                <tr key={enr.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-gray-900">{enr.student?.studentId}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{enr.student?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{enr.student?.user?.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-gray-500">No students found matching your search.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyStudents;
