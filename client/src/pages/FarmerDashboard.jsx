// src/pages/FarmerDashboard.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import { getMyListings, deleteListing } from '../services/listingService';
import { logoutUser } from '../services/authService';
import { formatCurrency, formatDate } from '../utils/helpers';
import ListingForm from '../components/listings/ListingForm';
import PageLoader from '../components/common/PageLoader';
import EmptyState from '../components/common/EmptyState';
import Spinner from '../components/common/Spinner';
import NotificationBell from '../components/common/NotificationBell';
import OrderTimeline from '../components/orders/OrderTimeline';
import { getIncomingOrders, updateOrderStatus } from '../services/orderService';
import {
  Plus, Trash2, Eye, LogOut,
  MessageCircle, ShoppingBag, LayoutList,
} from 'lucide-react';

// ── Status pill reused from buyer dashboard ───────────────────────────
const StatusPill = ({ status }) => {
  const config = {
    pending:    'bg-amber-50  text-amber-900  border border-amber-200',
    confirmed:  'bg-blue-50   text-blue-900   border border-blue-200',
    harvested:  'bg-purple-50 text-purple-900 border border-purple-200',
    in_transit: 'bg-indigo-50 text-indigo-900 border border-indigo-200',
    delivered:  'bg-green-50  text-green-900  border border-green-200',
    cancelled:  'bg-red-50    text-red-900    border border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[status] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const FarmerDashboard = () => {
  const { user, logout }  = useAuthStore();
  const navigate          = useNavigate();
  const queryClient       = useQueryClient();
  const { socket }        = useSocket();
  const [searchParams]    = useSearchParams();

  // Tab state — read from URL param so notification click can deep-link
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'orders' ? 'orders' : 'listings'
  );
  const [showForm,       setShowForm]       = useState(false);
  const [expandedOrder,  setExpandedOrder]  = useState(null);
  const [statusNote,     setStatusNote]     = useState('');

  // ── Queries ───────────────────────────────────────────────────────
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['myListings'],
    queryFn:  getMyListings,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['incomingOrders'],
    queryFn:  getIncomingOrders,
  });

  const listings = listingsData?.data?.listings || [];
  const orders   = ordersData?.data?.orders     || [];

  // Pending orders count — for badge on tab
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  // ── Mutations ─────────────────────────────────────────────────────
  const { mutate: handleDelete } = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      toast.success('Listing deleted');
    },
    onError: () => toast.error('Failed to delete listing'),
  });

  const { mutate: handleStatusUpdate, isPending: isUpdating } = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingOrders'] });
      toast.success('Order status updated');
      setExpandedOrder(null);
      setStatusNote('');
    },
    onError: (e) => toast.error(e.message || 'Failed to update status'),
  });

  const { mutate: handleLogout } = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => { logout(); navigate('/login'); },
  });

  if (listingsLoading) return <PageLoader />;

  const stats = {
    listings: listings.length,
    active:   listings.filter(l => l.status === 'available').length,
    orders:   orders.length,
    pending:  pendingCount,
  };

  // Next valid statuses a farmer can move an order to
  const nextStatuses = {
    pending:    ['confirmed', 'cancelled'],
    confirmed:  ['harvested', 'cancelled'],
    harvested:  ['in_transit'],
    in_transit: ['delivered'],
    delivered:  [],
    cancelled:  [],
  };

  const statusLabels = {
    confirmed:  'Confirm Order',
    harvested:  'Mark Harvested',
    in_transit: 'Mark In Transit',
    delivered:  'Mark Delivered',
    cancelled:  'Cancel Order',
  };

  const statusButtonStyles = {
    confirmed:  'bg-blue-600 hover:bg-blue-700 text-white',
    harvested:  'bg-purple-600 hover:bg-purple-700 text-white',
    in_transit: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    delivered:  'bg-green-600 hover:bg-green-700 text-white',
    cancelled:  'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">🌾 AgriConnect</span>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
              Farmer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/listings" className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Browse
            </Link>
            <Link to="/chat" className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <MessageCircle size={13} />
              <span className="hidden sm:inline">Messages</span>
            </Link>
            <NotificationBell socket={socket} />
            <span className="text-sm text-gray-400 hidden md:inline">{user?.name}</span>
            <button
              onClick={() => handleLogout()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* ── Stats ── */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'My listings',   value: stats.listings, dot: 'bg-gray-400'  },
            { label: 'Active',        value: stats.active,   dot: 'bg-green-500' },
            { label: 'Total orders',  value: stats.orders,   dot: 'bg-blue-500'  },
            { label: 'Pending',       value: stats.pending,  dot: 'bg-amber-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-semibold text-gray-900 leading-none mb-2">{s.value}</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {[
            { key: 'listings', label: 'My Listings', icon: <LayoutList size={14} /> },
            {
              key: 'orders',
              label: 'Incoming Orders',
              icon: <ShoppingBag size={14} />,
              badge: pendingCount,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── LISTINGS TAB ── */}
        {activeTab === 'listings' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">My Listings</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={15} />
                {showForm ? 'Cancel' : 'Add Listing'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-gray-800 mb-5">Create New Listing</h3>
                <ListingForm />
              </div>
            )}

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
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                              {listing.images?.[0]
                                ? <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                                : <span className="w-full h-full flex items-center justify-center text-lg">🌾</span>
                              }
                            </div>
                            <span className="font-medium text-gray-800 line-clamp-1">{listing.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{listing.category}</td>
                        <td className="px-4 py-3 font-medium text-primary-600">
                          {formatCurrency(listing.pricePerUnit)}/{listing.unit}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{listing.quantityAvailable}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(listing.estimatedAvailableDate)}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={listing.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/listings/${listing._id}`}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                            </Link>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this listing?')) {
                                  handleDelete(listing._id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Incoming Orders</h2>
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No orders yet"
                description="Orders from buyers will appear here"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                  >
                    {/* Order summary row */}
                    <div className="p-5">
                      <div className="flex items-start gap-4">

                        {/* Product image */}
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
                          {order.listing?.images?.[0]
                            ? <img src={order.listing.images[0]} alt="" className="w-full h-full object-cover" />
                            : '🌾'
                          }
                        </div>

                        {/* Order info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {order.snapshot?.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {order.quantity} {order.snapshot?.unit}
                                {' · '}
                                <span className="font-medium text-primary-600">
                                  {formatCurrency(order.totalAmount)}
                                </span>
                              </p>
                            </div>
                            <StatusPill status={order.status} />
                          </div>

                          {/* Buyer info */}
                          <div className="flex items-center gap-2 mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 overflow-hidden flex-shrink-0">
                              {order.buyer?.avatar
                                ? <img src={order.buyer.avatar} alt="" className="w-full h-full object-cover" />
                                : order.buyer?.name?.[0]?.toUpperCase()
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{order.buyer?.name}</p>
                              <p className="text-xs text-gray-400">{order.buyer?.email}</p>
                            </div>
                            <Link
                              to={`/chat?userId=${order.buyer?._id}&name=${encodeURIComponent(order.buyer?.name || '')}&role=buyer`}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors"
                            >
                              <MessageCircle size={12} />
                              Chat
                            </Link>
                          </div>

                          {/* Delivery date + note */}
                          <div className="flex gap-4 mt-2">
                            <p className="text-xs text-gray-400">
                              Delivery by:{' '}
                              <span className="text-gray-700 font-medium">
                                {formatDate(order.requestedDeliveryDate)}
                              </span>
                            </p>
                            {order.buyerNote && (
                              <p className="text-xs text-gray-400">
                                Note:{' '}
                                <span className="text-gray-600 italic">"{order.buyerNote}"</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for this order */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => setExpandedOrder(
                            expandedOrder === order._id ? null : order._id
                          )}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                            expandedOrder === order._id
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100'
                          }`}
                        >
                          <Eye size={12} />
                          {expandedOrder === order._id ? 'Hide' : 'View Details'}
                        </button>

                        {/* Status update buttons */}
                        {nextStatuses[order.status]?.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusUpdate({
                              id:     order._id,
                              status: nextStatus,
                              note:   statusNote,
                            })}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${statusButtonStyles[nextStatus]}`}
                          >
                            {isUpdating ? <Spinner size="sm" /> : statusLabels[nextStatus]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expandable order details */}
                    {expandedOrder === order._id && (
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          {/* Timeline */}
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                              Order timeline
                            </p>
                            <OrderTimeline
                              currentStatus={order.status}
                              statusHistory={order.statusHistory || []}
                            />
                          </div>

                          {/* Order details */}
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                              Order details
                            </p>
                            <div className="flex flex-col gap-2">
                              {[
                                { label: 'Product',    value: order.snapshot?.title },
                                { label: 'Quantity',   value: `${order.quantity} ${order.snapshot?.unit}` },
                                { label: 'Unit price', value: formatCurrency(order.snapshot?.pricePerUnit) },
                                { label: 'Total',      value: formatCurrency(order.totalAmount) },
                                { label: 'Ordered on', value: formatDate(order.createdAt) },
                                { label: 'Delivery',   value: formatDate(order.requestedDeliveryDate) },
                              ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                                  <span className="text-gray-400">{label}</span>
                                  <span className="font-medium text-gray-800">{value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Note to farmer */}
                            {['confirmed', 'harvested'].includes(order.status) && (
                              <div className="mt-4">
                                <label className="text-xs font-medium text-gray-500 block mb-1">
                                  Add a note for the buyer (optional)
                                </label>
                                <textarea
                                  rows={2}
                                  value={statusNote}
                                  onChange={(e) => setStatusNote(e.target.value)}
                                  placeholder="e.g. Will harvest tomorrow morning..."
                                  className="input text-sm resize-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;