import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { History, ArrowRight, CheckCircle, XCircle, BarChart3, Clock, CalendarDays, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

const StudentAttendance = () => {
  const [summary, setSummary] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, coursesRes, trendRes, histRes] = await Promise.all([
          api.get('/student/analytics/summary'),
          api.get('/student/analytics/courses'),
          api.get('/student/analytics/trends'),
          api.get('/student/attendance/history')
        ]);
        
        setSummary(sumRes.data.data);
        setCourses(coursesRes.data.data.courses || []);
        setTrends(trendRes.data.data.points);
        setHistory(histRes.data.data.sessions || []);
      } catch (err: any) {
        console.error("Failed to load attendance analytics", err);
        setError("Failed to load attendance analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading attendance analytics...</div>;
  }
  
  if (error) {
     return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // Basic chart calculation
  const maxPct = 100;
  
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
        <p className="text-gray-500 mt-1">Review your overall attendance, course breakdowns, and session history.</p>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Overall Attendance</div>
            <div className={cn("text-3xl font-bold mt-1", 
              summary.overallAttendancePercentage >= 75 ? "text-green-600" :
              summary.overallAttendancePercentage >= 50 ? "text-orange-600" : "text-red-600"
            )}>
              {summary.overallAttendancePercentage}%
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Attended</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.attendedSessions} <span className="text-sm text-gray-400 font-normal">/ {summary.totalSessions}</span></div>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Partial</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.partialSessions}</div>
          </div>
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Missed</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.missedSessions}</div>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Courses and Trends */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Course Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h2 className="text-lg font-semibold text-gray-900">Course Attendance</h2>
               <BookOpen className="w-5 h-5 text-gray-400" />
             </div>
             <div className="divide-y divide-gray-100">
               {courses.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">No course data available.</div>
               ) : (
                 courses.map((c: any) => (
                   <div key={c.courseId} className="p-6">
                     <div className="flex justify-between items-end mb-2">
                       <div>
                         <h3 className="font-bold text-gray-900">{c.courseName}</h3>
                         <div className="text-sm text-gray-500">{c.courseCode} • {c.totalSessions} sessions</div>
                       </div>
                       <div className={cn("text-lg font-bold", 
                          c.attendancePercentage >= 75 ? "text-green-600" :
                          c.attendancePercentage >= 50 ? "text-orange-600" : "text-red-600"
                       )}>
                         {c.attendancePercentage}%
                       </div>
                     </div>
                     <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3">
                       <div className={cn("h-2.5 rounded-full transition-all", 
                          c.attendancePercentage >= 75 ? "bg-green-500" :
                          c.attendancePercentage >= 50 ? "bg-orange-500" : "bg-red-500"
                       )} style={{ width: `${c.attendancePercentage}%` }}></div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          {/* Trend Chart (Simple CSS implementation) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center justify-between">
              Attendance Trend (Last 30 Days)
              <CalendarDays className="w-5 h-5 text-gray-400" />
            </h2>
            <div className="relative h-48 flex items-end justify-between gap-2 pt-6 border-b border-l border-gray-100 pb-2 pl-2">
              {/* Y-axis markers */}
              <div className="absolute left-0 top-0 h-full w-full pointer-events-none">
                <div className="absolute top-0 w-full border-t border-dashed border-gray-200"></div>
                <div className="absolute top-1/2 w-full border-t border-dashed border-gray-200"></div>
              </div>
              
              {trends.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400 absolute left-0 top-0">No trend data</div>
              ) : (
                trends.map((point: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                    <div className="w-full max-w-[24px] bg-blue-100 rounded-t-sm hover:bg-blue-200 transition-colors relative" style={{ height: `${point.attendancePercentage}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                        {point.attendancePercentage}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {trends.length > 0 && (
               <div className="flex justify-between mt-3 text-xs text-gray-400 font-medium px-2">
                 <span>{new Date(trends[0].date).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
                 <span>{new Date(trends[trends.length-1].date).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
               </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Sessions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
               <History className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No session history.</div>
              ) : (
                history.map((record: any) => (
                  <Link key={record.sessionId} to={`/student/attendance/${record.sessionId}`} className="block p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{record.courseName || record.subject}</h3>
                      <div className="mt-0.5 shrink-0">
                        {record.status === 'PRESENT' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : record.status === 'PARTIAL' ? (
                           <CheckCircle className="w-4 h-4 text-orange-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(record.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})} • {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-gray-500 font-mono">{record.verifiedMinutes}m verified</span>
                       <span className="font-semibold text-gray-900">{Math.round(record.attendancePercentage)}%</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
            
            {history.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                <span className="text-xs font-medium text-gray-400 uppercase">Showing last {history.length} sessions</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentAttendance;
