// src/router/index.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import OAuthSuccess from '../pages/OAuthSuccess';
import FarmerDashboard from '../pages/FarmerDashboard';
import BuyerDashboard from '../pages/BuyerDashboard';

// Home placeholder
const Home = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-primary-700 mb-2">🌾 AgriConnect</h1>
      <p className="text-gray-500 text-lg">Fresh from farm to your table</p>
      <div className="flex gap-3 mt-6 justify-center">
        <a href="/register" className="btn-primary">Get Started</a>
        <a href="/login" className="btn-secondary">Sign In</a>
      </div>
    </div>
  </div>
);

// ── Protected route ───────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// ── Public only route (redirect if logged in) ─────────────────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'} replace />;
  }
  return children;
};

const AppRouter = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Home />} />
    <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/oauth-success" element={<OAuthSuccess />} />

    {/* Protected — Farmer only */}
    <Route path="/farmer/dashboard" element={
      <ProtectedRoute allowedRoles={['farmer']}>
        <FarmerDashboard />
      </ProtectedRoute>
    } />

    {/* Protected — Buyer only */}
    <Route path="/buyer/dashboard" element={
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerDashboard />
      </ProtectedRoute>
    } />

    {/* 404 fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;