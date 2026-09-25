import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { AlertTriangle } from 'lucide-react';

const FacultyConflicts = () => {
  const { sessionId } = useParams();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        let url = '/faculty/conflicts';
        if (sessionId) {
          url = `/faculty/sessions/${sessionId}/conflicts`;
        }
        const res = await api.get(url);
        setConflicts(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConflicts();
  }, [sessionId]);

  if (loading) return <div className="p-8 animate-pulse">Loading conflicts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <AlertTriangle className="mr-2 text-yellow-600" /> 
          Attendance Conflicts
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Student</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Severity</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conflicts.map((conflict) => (
                <tr key={conflict.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{conflict.student?.name}</td>
                  <td className="px-6 py-4 text-gray-700">{conflict.conflictType}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      conflict.severity === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' :
                      conflict.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {conflict.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{conflict.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {conflicts.length === 0 && (
            <div className="p-12 text-center text-gray-500">No conflicts detected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyConflicts;
