// src/pages/ListingsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '../services/listingService';
import ListingCard from '../components/listings/ListingCard';
import PageLoader from '../components/common/PageLoader';
import EmptyState from '../components/common/EmptyState';
import { LISTING_CATEGORIES } from '../utils/constants';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/authService';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const ListingsPage = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  // ── Filter state ──────────────────────────────────────────────────
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page,     setPage]     = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // ── Active filters to pass as query params ────────────────────────
  // WHY this object? useQuery re-fetches whenever queryKey changes.
  // By including filters in queryKey, changing a filter auto-refetches.
  const filters = {
    ...(search   && { search }),
    ...(category && { category }),
    ...(minPrice && { minPrice }),
    ...(maxPrice && { maxPrice }),
    page,
    limit: 12,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listings', filters],  // refetches when filters change
    queryFn:  () => getListings(filters),
    keepPreviousData: true, // show old data while new data loads (smooth pagination)
  });

  const listings   = data?.data?.listings   || [];
  const pagination = data?.data?.pagination || {};

  const { mutate: handleLogout } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => { logout(); navigate('/login'); },
  });

  const clearFilters = () => {
    setSearch(''); setCategory('');
    setMinPrice(''); setMaxPrice('');
    setPage(1);
  };

  const hasActiveFilters = search || category || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-700">
            🌾 AgriConnect
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'}
                  className="btn-secondary text-sm text-white bg-black hover:bg-white hover:text-black transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => handleLogout()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Hero search bar */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Fresh Produce, Direct from Farms
          </h1>
          <p className="text-gray-500 mb-6">
            Connect directly with farmers — no middlemen, fair prices
          </p>

          {/* Search input */}
          <div className="flex gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search tomatoes, rice, milk..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 text-sm ${hasActiveFilters ? 'border-primary-400 text-primary-600' : ''}`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="card mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="input text-sm"
                >
                  <option value="">All categories</option>
                  {LISTING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Min Price */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Min Price (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                  className="input text-sm"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Max Price (₹)</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                  className="input text-sm"
                />
              </div>

              {/* Clear */}
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary text-sm w-full flex items-center justify-center gap-1.5"
                  >
                    <X size={13} /> Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category quick filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {['All', ...LISTING_CATEGORIES].map((cat) => {
            const val = cat === 'All' ? '' : cat;
            return (
              <button
                key={cat}
                onClick={() => { setCategory(val); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === val
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {isFetching ? 'Searching...' : `${pagination.total || 0} listings found`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <PageLoader />
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No listings found"
            description="Try adjusting your search or filters"
            action={
              hasActiveFilters && (
                <button onClick={clearFilters} className="btn-secondary text-sm">
                  Clear Filters
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm disabled:opacity-40"
                >
                  Previous
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasMore}
                  className="btn-secondary text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListingsPage;