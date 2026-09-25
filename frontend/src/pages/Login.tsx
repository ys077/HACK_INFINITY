import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam) {
      setError(errParam.replace(/_/g, ' '));
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    try {
      const res = await api.get('/auth/oidc/google/start');
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start Google login');
    }
  };


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
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">
            Login
          </button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            className="w-full flex justify-center items-center gap-2 border border-gray-300 bg-white text-gray-700 p-2 rounded hover:bg-gray-50 transition-colors font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
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
