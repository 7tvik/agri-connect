// src/pages/ListingDetail.jsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getListingById } from '../services/listingService';
import { createOrder } from '../services/orderService';
import useAuthStore from '../store/authStore';
import PageLoader from '../components/common/PageLoader';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MapPin, Calendar, Package, Star, ArrowLeft, ShoppingCart } from 'lucide-react';

const ListingDetail = () => {
  const { id } = useParams();         // get listing ID from URL
  const navigate  = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [quantity,   setQuantity]   = useState(1);
  const [delivDate,  setDelivDate]  = useState('');
  const [buyerNote,  setBuyerNote]  = useState('');
  const [activeImg,  setActiveImg]  = useState(0);

  // ── Fetch listing ─────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn:  () => getListingById(id),
  });

  const listing = data?.data?.listing;

  // ── Place order mutation ──────────────────────────────────────────
  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      toast.success('Order placed successfully! 🎉');
      navigate(`/buyer/dashboard`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to place order');
    },
  });

  const handleBooking = () => {
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    if (user?.role === 'farmer') {
      toast.error('Farmers cannot place orders');
      return;
    }
    if (!delivDate) {
      toast.error('Please select a delivery date');
      return;
    }
    placeOrder({
      listingId:             id,
      quantity,
      requestedDeliveryDate: delivDate,
      buyerNote,
    });
  };

  if (isLoading) return <PageLoader />;
  if (isError || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Listing not found</p>
          <Link to="/listings" className="btn-primary text-sm">Browse Listings</Link>
        </div>
      </div>
    );
  }

  const today    = new Date().toISOString().split('T')[0];
  const maxQty   = listing.quantityAvailable;
  const total    = listing.pricePerUnit * quantity;
  const isMine   = user?._id === listing.farmer?._id;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-bold text-primary-700">🌾 AgriConnect</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Images + Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Image gallery */}
            <div className="card p-0 overflow-hidden">
              {/* Main image */}
              <div className="h-72 bg-gray-100">
                {listing.images?.length > 0 ? (
                  <img
                    src={listing.images[activeImg]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🌾</div>
                )}
              </div>
              {/* Thumbnails */}
              {listing.images?.length > 1 && (
                <div className="flex gap-2 p-3">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImg ? 'border-primary-500' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="badge bg-primary-100 text-primary-700 text-xs mb-2">
                    {listing.category}
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                </div>
                <span className={`badge text-xs ${
                  listing.status === 'available'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {listing.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold text-primary-600">
                  {formatCurrency(listing.pricePerUnit)}
                </span>
                <span className="text-gray-400">per {listing.unit}</span>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">{listing.description}</p>

              {/* Key details */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Package size={15}/>, label: 'Available', value: `${listing.quantityAvailable} ${listing.unit}` },
                  { icon: <Calendar size={15}/>, label: 'Ready By', value: formatDate(listing.estimatedAvailableDate) },
                  { icon: <MapPin size={15}/>, label: 'Location', value: listing.farmer?.location?.city || 'Not specified' },
                  { icon: <Star size={15}/>, label: 'Rating', value: listing.farmer?.rating?.average > 0 ? `${listing.farmer.rating.average.toFixed(1)} ⭐` : 'No reviews yet' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-400">{item.icon}</span>
                    <div>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Farmer info */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">About the Farmer</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center text-xl font-bold text-primary-700 flex-shrink-0">
                  {listing.farmer?.avatar
                    ? <img src={listing.farmer.avatar} alt="" className="w-full h-full object-cover" />
                    : listing.farmer?.name?.[0]?.toUpperCase()
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{listing.farmer?.name}</p>
                  {listing.farmer?.location?.city && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin size={12} /> {listing.farmer.location.city}, {listing.farmer.location.state}
                    </p>
                  )}
                  {listing.farmer?.rating?.average > 0 && (
                    <p className="text-sm text-amber-500 font-medium mt-0.5">
                      ⭐ {listing.farmer.rating.average.toFixed(1)} ({listing.farmer.rating.count} reviews)
                    </p>
                  )}
                </div>
              </div>
              {listing.farmer?.bio && (
                <p className="mt-3 text-sm text-gray-500">{listing.farmer.bio}</p>
              )}
            </div>
          </div>

          {/* Right: Booking card (sticky) */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary-600" />
                Book This Listing
              </h3>

              {listing.status !== 'available' ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">This listing is no longer available</p>
                </div>
              ) : isMine ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">This is your listing</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">

                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Quantity ({listing.unit})
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="input text-center flex-1"
                      />
                      <button
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Max: {maxQty} {listing.unit}</p>
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Preferred Delivery Date
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={delivDate}
                      onChange={(e) => setDelivDate(e.target.value)}
                      className="input text-sm"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Note to Farmer (optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any special requirements..."
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                      className="input resize-none text-sm"
                    />
                  </div>

                  {/* Total */}
                  <div className="bg-primary-50 rounded-xl p-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{formatCurrency(listing.pricePerUnit)} × {quantity} {listing.unit}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-lg">
                      <span>Total</span>
                      <span className="text-primary-600">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Book button */}
                  {isAuthenticated ? (
                    <button
                      onClick={handleBooking}
                      disabled={isPending}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {isPending ? 'Placing order...' : '🛒 Place Order'}
                    </button>
                  ) : (
                    <Link to="/login" className="btn-primary w-full text-center block">
                      Login to Book
                    </Link>
                  )}

                  <p className="text-xs text-gray-400 text-center">
                    Payment collected after farmer confirms order
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ListingDetail;