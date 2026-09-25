import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Users, GraduationCap, Building2, CalendarDays, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const AdminAttendanceAnalytics = () => {
  const [overview, setOverview] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, deptRes] = await Promise.all([
          api.get('/admin/analytics/overview'),
          api.get('/admin/analytics/departments')
        ]);
        
        setOverview(overviewRes.data.data);
        setDepartments(deptRes.data.data.departments);
      } catch (err: any) {
        console.error("Failed to load admin analytics", err);
        setError("Failed to load admin analytics.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading institution analytics...</div>;
  }
  
  if (error) {
     return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Institution Attendance Analytics</h1>
        <p className="text-gray-500 mt-1">Overview of attendance metrics across all departments.</p>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Institution Average</div>
            <div className={cn("text-3xl font-bold mt-1", 
              overview.averageAttendance >= 75 ? "text-green-600" :
              overview.averageAttendance >= 50 ? "text-orange-600" : "text-red-600"
            )}>
              {overview.averageAttendance}%
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Students</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{overview.totalStudents}</div>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Faculty</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{overview.totalFaculty}</div>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Sessions Conducted</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{overview.totalSessions}</div>
          </div>
          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Department Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h2 className="text-lg font-semibold text-gray-900">Department Performance</h2>
               <Building2 className="w-5 h-5 text-gray-400" />
             </div>
             <div className="divide-y divide-gray-100">
               {departments.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">No department data available.</div>
               ) : (
                 departments.map((dept: any) => (
                   <div key={dept.departmentId} className="p-6 hover:bg-gray-50 transition-colors">
                     <div className="flex justify-between items-end mb-2">
                       <div>
                         <h3 className="font-bold text-gray-900">{dept.departmentName}</h3>
                         <div className="text-sm text-gray-500">{dept.departmentCode} • {dept.studentCount} students</div>
                       </div>
                       <div className={cn("text-lg font-bold", 
                          dept.averageAttendance >= 75 ? "text-green-600" :
                          dept.averageAttendance >= 50 ? "text-orange-600" : "text-red-600"
                       )}>
                         {dept.averageAttendance}%
                       </div>
                     </div>
                     <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3">
                       <div className={cn("h-2.5 rounded-full transition-all", 
                          dept.averageAttendance >= 75 ? "bg-green-500" :
                          dept.averageAttendance >= 50 ? "bg-orange-500" : "bg-red-500"
                       )} style={{ width: `${dept.averageAttendance}%` }}></div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAttendanceAnalytics;
