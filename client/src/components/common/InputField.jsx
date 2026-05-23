// src/components/common/InputField.jsx
const InputField = ({ label, error, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
};

export default InputField;