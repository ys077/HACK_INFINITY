import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/health')
      .then(response => {
        setHealth(response.data);
      })
      .catch(error => {
        console.error('Error fetching health:', error);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Continuous Classroom Presence Attendance System</h1>
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Backend Health Check</h2>
        {health ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Service:</strong> {health.service}</p>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Checking backend health... Make sure backend is running on port 5000.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
