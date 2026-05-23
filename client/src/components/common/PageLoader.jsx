// src/components/common/PageLoader.jsx
import Spinner from './Spinner';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Spinner size="lg" />
      <p className="mt-3 text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

export default PageLoader;