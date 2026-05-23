// src/pages/OAuthSuccess.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../services/authService';
import useAuthStore from '../store/authStore';
import Spinner from '../components/common/Spinner';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const { data, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (data?.data?.user) {
      setUser(data.data.user);
      const role = data.data.user.role;
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard');
    }
    if (isError) {
      navigate('/login?error=oauth_failed');
    }
  }, [data, isError, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;