import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log("[AUTH DEBUG] Login request started", { baseURL: api.defaults.baseURL });
    try {
      const res = await api.post('/auth/login', { 
        email: email.trim(), 
        password 
      });
      console.log("[AUTH DEBUG] Login response received", {
          status: res.status,
          success: res.data?.success
      });
      const { accessToken, user } = res.data.data;
      login(accessToken, user);
      
      if (user.role === 'FACULTY') {
        navigate('/faculty/dashboard');
      } else if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error("[AUTH DEBUG] Login failed", {
          message: err?.message,
          code: err?.code,
          status: err?.response?.status,
          hasResponse: !!err?.response,
          hasRequest: !!err?.request
      });
      const data = err.response?.data;
      if (data?.errors) {
        setError(JSON.stringify(data.errors));
      } else {
        setError(data?.message || err.message || 'Login failed');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && <div className="mb-4 text-red-500 bg-red-100 p-2 rounded">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full border p-2 rounded" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border p-2 rounded pr-10" 
                required 
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Login
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            API URL: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
