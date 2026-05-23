// src/pages/FarmerDashboard.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getMyListings, deleteListing } from '../services/listingService';
import { logoutUser } from '../services/authService';
import { formatCurrency, formatDate } from '../utils/helpers';
import ListingForm from '../components/listings/ListingForm';
import PageLoader from '../components/common/PageLoader';
import EmptyState from '../components/common/EmptyState';
import Spinner from '../components/common/Spinner';
import { Plus, Trash2, Edit, Eye, LogOut, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FarmerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // ── Fetch this farmer's listings ─────────────────────────────────
  // useQuery automatically: fetches on mount, shows loading state,
  // caches result, refetches when queryKey changes, handles errors
  const { data, isLoading } = useQuery({
    queryKey: ['myListings'],        // unique cache key
    queryFn:  getMyListings,         // function that fetches data
  });

  const listings = data?.data?.listings || [];

  // ── Delete mutation ───────────────────────────────────────────────
  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      toast.success('Listing deleted');
    },
    onError: () => toast.error('Failed to delete listing'),
  });

  // ── Logout mutation ───────────────────────────────────────────────
  const { mutate: handleLogout } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
      toast.success('Logged out');
      navigate('/login');
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary-700">🌾 AgriConnect</span>
            <span className="badge bg-primary-100 text-primary-700 text-xs">Farmer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Hello, <span className="font-medium text-gray-800">{user?.name}</span>
            </span>
            <button
              onClick={() => handleLogout()}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Listings', value: listings.length, icon: '📋' },
            { label: 'Active',  value: listings.filter(l => l.status === 'available').length,  icon: '✅' },
            { label: 'Reserved', value: listings.filter(l => l.status === 'reserved').length, icon: '📦' },
          ].map((stat) => (
            <div key={stat.label} className="card flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Header + Add button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : 'Add Listing'}
          </button>
        </div>

        {/* Create listing form (toggle) */}
        {showForm && (
          <div className="card mb-8">
            <h3 className="font-semibold text-gray-800 mb-6">Create New Listing</h3>
            <ListingForm />
          </div>
        )}

        {/* Listings table */}
        {listings.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No listings yet"
            description="Create your first listing to start selling"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
                Create First Listing
              </button>
            }
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Product', 'Category', 'Price', 'Qty', 'Ready By', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.map((listing) => (
                  <tr key={listing._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {listing.images?.[0]
                            ? <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center">🌾</span>
                          }
                        </div>
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {listing.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{listing.category}</td>
                    <td className="px-4 py-3 font-medium text-primary-600">
                      {formatCurrency(listing.pricePerUnit)}/{listing.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{listing.quantityAvailable}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(listing.estimatedAvailableDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${
                        listing.status === 'available'
                          ? 'bg-green-100 text-green-700'
                          : listing.status === 'reserved'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/listings/${listing._id}`}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this listing?')) {
                              handleDelete(listing._id);
                            }
                          }}
                          disabled={isDeleting}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          {isDeleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;