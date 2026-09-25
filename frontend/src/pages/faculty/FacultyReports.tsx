
import { BarChart2 } from 'lucide-react';

const FacultyReports = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart2 className="mr-2 text-blue-600" /> 
          Attendance Reports
        </h1>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
        <p>Reports module is currently under construction.</p>
        <p className="text-sm mt-2">Historical analytics and export features will be available here.</p>
      </div>
    </div>
  );
};

export default FacultyReports;
