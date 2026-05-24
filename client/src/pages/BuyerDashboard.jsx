// src/pages/BuyerDashboard.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getMyOrders, cancelOrder } from '../services/orderService';
import { logoutUser } from '../services/authService';
import { formatCurrency, formatDate } from '../utils/helpers';
import OrderTimeline from '../components/orders/OrderTimeline';
import PageLoader from '../components/common/PageLoader';
import EmptyState from '../components/common/EmptyState';
import { LogOut, MapPin, MessageCircle, Star, X, Eye } from 'lucide-react';

// ── Reusable status pill ──────────────────────────────────────────────
// One single component — consistent everywhere in the app
const StatusPill = ({ status }) => {
  const config = {
    pending:    { label: 'Pending',     cls: 'bg-amber-50  text-amber-900  border border-amber-200'  },
    confirmed:  { label: 'Confirmed',   cls: 'bg-blue-50   text-blue-900   border border-blue-200'   },
    harvested:  { label: 'Harvested',   cls: 'bg-purple-50 text-purple-900 border border-purple-200' },
    in_transit: { label: 'In transit',  cls: 'bg-indigo-50 text-indigo-900 border border-indigo-200' },
    delivered:  { label: 'Delivered',   cls: 'bg-green-50  text-green-900  border border-green-200'  },
    cancelled:  { label: 'Cancelled',   cls: 'bg-red-50    text-red-900    border border-red-200'    },
  };
  const c = config[status] || { label: status, cls: 'bg-gray-50 text-gray-700 border border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── Filter tab config ─────────────────────────────────────────────────
const FILTERS = [
  { value: '',           label: 'All orders'  },
  { value: 'pending',    label: 'Pending'     },
  { value: 'confirmed',  label: 'In progress' },
  { value: 'in_transit', label: 'In transit'  },
  { value: 'delivered',  label: 'Delivered'   },
  { value: 'cancelled',  label: 'Cancelled'   },
];

const BuyerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate         = useNavigate();
  const queryClient      = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId,   setExpandedId]   = useState(null);

  // All orders — for accurate stats always
  const { data: allData } = useQuery({
    queryKey: ['myOrders', 'all'],
    queryFn:  () => getMyOrders({}),
  });

  // Filtered orders — for the list
  const { data, isLoading } = useQuery({
    queryKey: ['myOrders', statusFilter],
    queryFn:  () => getMyOrders(statusFilter ? { status: statusFilter } : {}),
  });

  const orders    = data?.data?.orders    || [];
  const allOrders = allData?.data?.orders || [];

  // Stats always based on allOrders — never the filtered list
  const stats = {
    total:     allOrders.length,
    pending:   allOrders.filter(o => o.status === 'pending').length,
    active:    allOrders.filter(o => ['confirmed', 'harvested', 'in_transit'].includes(o.status)).length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  };

  const { mutate: handleCancel } = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success('Order cancelled');
      setExpandedId(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to cancel order'),
  });

  const { mutate: handleLogout } = useMutation({
    mutationFn: logoutUser,
    onSuccess:  () => { logout(); navigate('/login'); },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">🌾 AgriConnect</span>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
              Buyer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/listings" className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-black bg-white hover:bg-grey hover:text-black transition-colors">
              Browse listings
            </Link>
            <span className="text-sm text-gray-400 hidden md:inline">
              {user?.name}
            </span>
            <button
              onClick={() => handleLogout()}
              className="flex items-center gap-1.5 text-xs text-white bg-black hover:bg-gray-900 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* ── Stats ── */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-8">
          {[
            { label: 'Total orders', value: stats.total,     dot: 'bg-gray-400',       span: false },
            { label: 'Pending',      value: stats.pending,   dot: 'bg-amber-500',      span: false },
            { label: 'In progress',  value: stats.active,    dot: 'bg-blue-500',       span: false },
            { label: 'Delivered',    value: stats.delivered, dot: 'bg-green-600',      span: false },
            { label: 'Cancelled',    value: stats.cancelled, dot: 'bg-red-500',        span: true  },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white border border-gray-100 rounded-xl p-4 ${
                s.span ? 'col-span-2 md:col-span-1' : ''
              }`}
            >
              <div className="text-2xl font-semibold text-gray-900 leading-none mb-2">
                {s.value}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">My orders</p>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-5">
          {FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            const activeStyles = {
              '':           'bg-gray-900 text-white border-gray-900',
              'pending':    'bg-amber-100 text-amber-900 border-amber-300',
              'confirmed':  'bg-blue-100 text-blue-900 border-blue-300',
              'in_transit': 'bg-indigo-100 text-indigo-900 border-indigo-300',
              'delivered':  'bg-green-100 text-green-900 border-green-300',
              'cancelled':  'bg-red-100 text-red-900 border-red-300',
            };
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                  isActive
                    ? activeStyles[f.value]
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Orders list ── */}
        {orders.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No orders yet"
            description="Browse listings and place your first order"
            action={
              <Link to="/listings" className="btn-primary text-sm">
                Browse listings
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden"
              >
                {/* Order row */}
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3 md:gap-4">

                    {/* Image */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
                      {order.snapshot?.image
                        ? <img src={order.snapshot.image} alt="" className="w-full h-full object-cover" />
                        : '🌾'
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 leading-tight">
                            {order.snapshot?.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {order.quantity} {order.snapshot?.unit}
                            {' · '}
                            From {order.farmer?.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Delivery by {formatDate(order.requestedDeliveryDate)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <StatusPill status={order.status} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      {order.status !== 'cancelled' && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">

                          {/* Track — always visible except cancelled */}
                          <button
                            onClick={() => setExpandedId(
                              expandedId === order._id ? null : order._id
                            )}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                              expandedId === order._id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            <Eye size={12} />
                            {expandedId === order._id ? 'Hide details' : 'Track order'}
                          </button>

                          {/* Message farmer */}
                          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-all">
                            <MessageCircle size={12} />
                            Message farmer
                          </button>

                          {/* Cancel — only pending */}
                          {order.status === 'pending' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Cancel this order?')) {
                                  handleCancel(order._id);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border text-red-700 bg-red-50 border-red-200 hover:bg-red-100 transition-all"
                            >
                              <X size={12} />
                              Cancel order
                            </button>
                          )}

                          {/* Review — only delivered + not reviewed */}
                          {order.status === 'delivered' && !order.isReviewed && (
                            <button className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 transition-all">
                              <Star size={12} />
                              Leave a review
                            </button>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable timeline */}
                {expandedId === order._id && (
                  <div className="border-t border-gray-100 px-4 md:px-5 py-5 bg-gray-50">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                      Order timeline
                    </p>
                    <OrderTimeline
                      currentStatus={order.status}
                      statusHistory={order.statusHistory || []}
                    />
                    {order.farmerNote && (
                      <div className="mt-4 p-3 bg-white border border-amber-100 rounded-xl">
                        <p className="text-xs font-medium text-amber-700 mb-1">
                          Note from farmer
                        </p>
                        <p className="text-sm text-gray-600">{order.farmerNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;