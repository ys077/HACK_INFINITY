import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Users, CalendarDays, CheckCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

const FacultyClassAnalytics = () => {
  const { classId } = useParams<{ classId: string }>();
  const [summary, setSummary] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, studRes] = await Promise.all([
          api.get(`/faculty/classes/${classId}/analytics/summary`),
          api.get(`/faculty/classes/${classId}/analytics/students`)
        ]);
        
        setSummary(sumRes.data.data);
        setStudents(studRes.data.data.students);
      } catch (err: any) {
        console.error("Failed to load class analytics", err);
        setError("Failed to load class analytics.");
      } finally {
        setLoading(false);
      }
    };
    
    if (classId) {
      fetchData();
    }
  }, [classId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading class analytics...</div>;
  }
  
  if (error) {
     return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  const lowAttendanceStudents = students.filter(s => s.attendancePercentage < 75);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to={`/faculty/classes/${classId}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Analytics</h1>
          <p className="text-gray-500 mt-1">Review attendance performance for this class.</p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Average Attendance</div>
            <div className={cn("text-3xl font-bold mt-1", 
              summary.averageAttendance >= 75 ? "text-green-600" :
              summary.averageAttendance >= 50 ? "text-orange-600" : "text-red-600"
            )}>
              {summary.averageAttendance}%
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Enrolled</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.totalStudents}</div>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Sessions</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.totalSessions}</div>
          </div>
          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Avg Verified Time</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{Math.round(summary.averageVerifiedDurationSeconds / 60)}m</div>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Student Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h2 className="text-lg font-semibold text-gray-900">Student Breakdown</h2>
               <Users className="w-5 h-5 text-gray-400" />
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                     <th className="p-4 font-medium">Student</th>
                     <th className="p-4 font-medium text-center">Attended</th>
                     <th className="p-4 font-medium text-center">Partial</th>
                     <th className="p-4 font-medium text-center">Missed</th>
                     <th className="p-4 font-medium text-right">Attendance %</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {students.map(s => (
                     <tr key={s.studentId} className="hover:bg-gray-50 transition-colors">
                       <td className="p-4">
                         <div className="font-medium text-gray-900">{s.studentName}</div>
                         <div className="text-xs text-gray-500">{s.studentId}</div>
                       </td>
                       <td className="p-4 text-center font-medium text-green-600">{s.sessionsAttended}</td>
                       <td className="p-4 text-center font-medium text-orange-500">{s.partialSessions}</td>
                       <td className="p-4 text-center font-medium text-red-500">{s.missedSessions}</td>
                       <td className="p-4 text-right">
                         <span className={cn("px-2 py-1 rounded-full text-xs font-semibold",
                           s.attendancePercentage >= 75 ? "bg-green-100 text-green-700" :
                           s.attendancePercentage >= 50 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                         )}>
                           {s.attendancePercentage}%
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Right Column: Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
               <h2 className="text-lg font-semibold text-red-900">Low Attendance Alerts</h2>
               <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {lowAttendanceStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">All students are above 75%.</div>
              ) : (
                lowAttendanceStudents.map(s => (
                  <div key={s.studentId} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 text-sm">{s.studentName}</h3>
                      <div className="font-bold text-red-600">{s.attendancePercentage}%</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.studentId} • Missed {s.missedSessions} sessions
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

export default FacultyClassAnalytics;
