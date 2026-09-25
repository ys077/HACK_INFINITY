import { useEffect, useState } from 'react';
import api from '../../services/api';
import { History, Calendar } from 'lucide-react';

const FacultyAttendanceHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/faculty/sessions'); // we can filter by ENDED on frontend or backend
        // Filter out non-ended if the API returns all
        const ended = res.data.data.filter((s: any) => s.status === 'ENDED' || s.status === 'COMPLETED');
        setHistory(ended);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="p-8 animate-pulse">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <History className="mr-2" /> Attendance History
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Course</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Section</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Duration</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2 text-gray-400" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{session.class?.section?.course?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{session.class?.section}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {session.durationMinutes ? `${session.durationMinutes} min` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold border border-gray-200">
                      FINALIZED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="p-12 text-center text-gray-500">No attendance history available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyAttendanceHistory;
