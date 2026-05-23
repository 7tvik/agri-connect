import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Home = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-primary-700 mb-2">🌾 AgriConnect</h1>
      <p className="text-gray-500 text-lg">Fresh from farm to your table</p>
      <p className="mt-4 text-sm text-primary-600 font-medium">
        ✅ React + Vite + Tailwind running
      </p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Home />} />
  </Routes>
);

export default AppRouter;