// src/pages/Login.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../services/authService';
import useAuthStore from '../store/authStore';
import InputField from '../components/common/InputField';
import Spinner from '../components/common/Spinner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setUser(data.data.user);
      toast.success(`Welcome back, ${data.data.user.name}! 👋`);
      const role = data.data.user.role;
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Login failed');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🌾 AgriConnect</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">

            <InputField
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <InputField
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isPending ? <Spinner size="sm" /> : null}
              {isPending ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <a
            href="http://localhost:5000/api/auth/google"
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Continue with Google
          </a>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;