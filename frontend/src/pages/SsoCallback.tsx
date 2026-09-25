import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    if (accessToken) {
      sessionStorage.setItem('token', accessToken);
      window.location.href = '/login'; 
    } else {
      navigate('/login?error=SSO_Failed');
    }
  }, [searchParams, navigate]);

  return <div className="flex h-screen items-center justify-center text-gray-500">Authenticating...</div>;
}
