import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { BookOpen, Users, MapPin, Clock, ArrowLeft, Radio } from 'lucide-react';

const StudentClassDetails = () => {
  const { classId } = useParams();
  const [cls, setCls] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        const res = await api.get(`/student/classes/${classId}`);
        setCls(res.data.data);
      } catch (err) {
        console.error("Failed to load class details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClassDetails();
  }, [classId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading class details...</div>;
  }

  if (!cls) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You are not enrolled in this class or it does not exist.</p>
        <Link to="/student/classes" className="text-blue-600 hover:underline">Return to My Classes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/classes" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{cls.section?.course?.name}</h1>
          <div className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
            <span>{cls.section?.course?.code}</span>
            <span>•</span>
            <span className="text-blue-600 uppercase font-semibold">{cls.section?.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">Class Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Course</div>
                  <div className="font-semibold text-gray-900">{cls.section?.course?.name}</div>
                  <div className="text-xs text-gray-500">{cls.section?.course?.code}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Faculty</div>
                  <div className="font-semibold text-gray-900">{cls.faculty?.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Classroom</div>
                  <div className="font-semibold text-gray-900">{cls.classroom?.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Link to="/student/sessions" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                <Radio className="w-5 h-5" />
                Check Live Sessions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentClassDetails;
