// src/router/index.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

import Login           from '../pages/Login';
import Register        from '../pages/Register';
import OAuthSuccess    from '../pages/OAuthSuccess';
import FarmerDashboard from '../pages/FarmerDashboard';
import BuyerDashboard  from '../pages/BuyerDashboard';
import ListingsPage    from '../pages/ListingsPage';
import ListingDetail   from '../pages/ListingDetail';

// Home page
const Home = () => {
  const { isAuthenticated, user } = useAuthStore();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-700 mb-2">🌾 AgriConnect</h1>
        <p className="text-gray-500 text-lg mb-6">Fresh from farm to your table</p>
        <div className="flex gap-3 justify-center">
          <a href="/listings" className="btn-primary">Browse Listings</a>
          {isAuthenticated
            ? <a href={user?.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'} className="btn-secondary">Dashboard</a>
            : <a href="/register" className="btn-secondary">Join as Farmer</a>
          }
        </div>
      </div>
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Public only route (redirect logged-in users)
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
    <Route path="/"          element={<Home />} />
    <Route path="/listings"  element={<ListingsPage />} />
    <Route path="/listings/:id" element={<ListingDetail />} />
    <Route path="/login"     element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register"  element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/oauth-success" element={<OAuthSuccess />} />

    {/* Farmer protected */}
    <Route path="/farmer/dashboard" element={
      <ProtectedRoute allowedRoles={['farmer']}>
        <FarmerDashboard />
      </ProtectedRoute>
    } />

    {/* Buyer protected */}
    <Route path="/buyer/dashboard" element={
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerDashboard />
      </ProtectedRoute>
    } />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;