// src/components/common/Spinner.jsx
const Spinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin`} />
    </div>
  );
};

export default Spinner;