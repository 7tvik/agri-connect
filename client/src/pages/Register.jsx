// src/pages/Register.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerUser } from '../services/authService';
import useAuthStore from '../store/authStore';
import InputField from '../components/common/InputField';
import Spinner from '../components/common/Spinner';

// ── Zod validation schema ─────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['farmer', 'buyer'], { required_error: 'Please select a role' }),
});

const Register = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const { mutate, isPending } = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setUser(data.data.user);
      toast.success(`Welcome to AgriConnect, ${data.data.user.name}! 🌾`);
      // Redirect based on role
      const role = data.data.user.role;
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const onSubmit = (data) => mutate(data);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🌾 AgriConnect</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        {/* Form card */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

            <InputField
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              error={errors.name?.message}
              {...register('name')}
            />

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
              placeholder="At least 6 characters"
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Role selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['farmer', 'buyer'].map((role) => (
                  <label
                    key={role}
                    className="relative flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary-400 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50"
                  >
                    <input
                      type="radio"
                      value={role}
                      className="sr-only"
                      {...register('role')}
                    />
                    <span className="text-2xl">
                      {role === 'farmer' ? '👨‍🌾' : '🛒'}
                    </span>
                    <span className="text-sm font-medium capitalize text-gray-700">
                      {role}
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="text-xs text-red-500">{errors.role.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {isPending ? <Spinner size="sm" /> : null}
              {isPending ? 'Creating account...' : 'Create Account'}
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google OAuth */}
            <a
            href="http://localhost:5000/api/auth/google"
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
            <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-4 h-4"
            />
            Continue with Google
            </a>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;