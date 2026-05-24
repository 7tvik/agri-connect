// src/components/listings/ListingCard.jsx
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { MapPin, Calendar, Package } from 'lucide-react';

const ListingCard = ({ listing }) => {
  const {
    _id, title, images, pricePerUnit, unit,
    category, quantityAvailable,
    estimatedAvailableDate, farmer, status,
  } = listing;

  return (
    <Link
      to={`/listings/${_id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            🌾
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 badge bg-white text-gray-700 shadow-sm text-xs">
          {category}
        </span>
        {/* Status indicator */}
        {status !== 'available' && (
          <span className="absolute top-3 right-3 badge bg-red-100 text-red-700 text-xs">
            {status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h3>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-xl font-bold text-primary-600">
            {formatCurrency(pricePerUnit)}
          </span>
          <span className="text-sm text-gray-400">/{unit}</span>
        </div>

        {/* Meta info */}
        <div className="flex flex-col gap-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Package size={12} />
            <span>{quantityAvailable} {unit} available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>Ready by {formatDate(estimatedAvailableDate)}</span>
          </div>
          {farmer?.location?.city && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} />
              <span>{farmer.location.city}, {farmer.location.state}</span>
            </div>
          )}
        </div>

        {/* Farmer info */}
        {farmer && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 overflow-hidden">
              {farmer.avatar
                ? <img src={farmer.avatar} alt={farmer.name} className="w-full h-full object-cover" />
                : farmer.name?.[0]?.toUpperCase()
              }
            </div>
            <span className="text-xs text-gray-500">{farmer.name}</span>
            {farmer.rating?.average > 0 && (
              <span className="ml-auto text-xs text-amber-500 font-medium">
                ⭐ {farmer.rating.average.toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ListingCard;