// src/pages/BuyerDashboard.jsx
import useAuthStore from '../store/authStore';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/authService';
import toast from 'react-hot-toast';

const BuyerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { mutate: handleLogout } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
      toast.success('Logged out successfully');
      navigate('/login');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🛒 Buyer Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Welcome back, <span className="font-medium text-primary-600">{user?.name}</span>
              </p>
              <span className="badge bg-earth-100 text-earth-700 mt-2">
                {user?.role}
              </span>
            </div>
            <button onClick={() => handleLogout()} className="btn-secondary text-sm">
              Logout
            </button>
          </div>
          <div className="mt-6 p-4 bg-earth-50 rounded-xl">
            <p className="text-sm text-earth-700 font-medium">
              ✅ Auth system working! Buyer dashboard coming in next phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;