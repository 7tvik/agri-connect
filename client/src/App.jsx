import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import AppRouter from './router/index.jsx';
import useAuthStore from './store/authStore.js';

function App() {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;