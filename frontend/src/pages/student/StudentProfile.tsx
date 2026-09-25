
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Hash, BookOpen } from 'lucide-react';

const StudentProfile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">View your student account details.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-200 bg-gray-50/50 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4 border-4 border-white shadow-sm">
             <User className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
          <div className="text-blue-600 font-medium uppercase tracking-wide text-sm mt-1">{user?.role}</div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Account Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-400 border border-gray-100">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium">Student ID</div>
                <div className="font-semibold text-gray-900">{user?.employeeId || user?.studentId || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-400 border border-gray-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium">Email Address</div>
                <div className="font-semibold text-gray-900">{user?.email || 'N/A'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-400 border border-gray-100">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium">Department</div>
                <div className="font-semibold text-gray-900">Computer Science</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-yellow-50 border-t border-yellow-100">
           <p className="text-sm text-yellow-800">
             <strong>Note:</strong> Profile information is managed by the academic administration. To request changes to your name, student ID, or department, please contact the registrar's office.
           </p>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
