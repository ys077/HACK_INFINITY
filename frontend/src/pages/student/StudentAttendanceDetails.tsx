import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Clock, History, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const StudentAttendanceDetails = () => {
  const { sessionId } = useParams();
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get(`/student/sessions/${sessionId}/attendance`);
        setCalculation(res.data.data);
      } catch (err) {
        console.error("Failed to load attendance details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [sessionId]);

  if (loading) return <div className="flex justify-center mt-12 text-gray-500">Loading attendance data...</div>;

  if (!calculation) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Attendance Data</h2>
        <p className="text-gray-500 mb-6">Attendance has not been calculated for this session yet.</p>
        <Link to="/student/attendance" className="text-blue-600 font-medium">Return to History</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Session Attendance</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 text-center bg-gray-50/50 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-white shadow-sm border border-gray-100">
             {calculation.status === 'PRESENT' ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : calculation.status === 'PARTIAL' ? (
                  <CheckCircle className="w-8 h-8 text-orange-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
          </div>
          <h2 className={cn("text-3xl font-bold uppercase tracking-wide", 
            calculation.status === 'PRESENT' ? "text-green-600" :
            calculation.status === 'PARTIAL' ? "text-orange-600" : "text-red-600"
          )}>
            {calculation.status}
          </h2>
          <div className="mt-2 text-3xl font-light text-gray-900">
            {calculation.attendancePercentage}% <span className="text-base font-medium text-gray-500">Verified Presence</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" /> Verified Duration
              </span>
              <span className="font-mono font-bold text-gray-900 text-lg">
                {Math.floor(calculation.verifiedSeconds / 60)} min
              </span>
           </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-center">
          <Link
            to={`/student/timeline/${sessionId}`}
            className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 bg-white border border-gray-200 hover:border-blue-200 px-6 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <History className="w-4 h-4" />
            View Detailed Timeline
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceDetails;
