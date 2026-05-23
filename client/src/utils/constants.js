export const ROLES = {
  FARMER: 'farmer',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

export const ORDER_STATUS = {
  PENDING:   { label: 'Pending',    color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmed',  color: 'bg-blue-100 text-blue-800'    },
  HARVESTED: { label: 'Harvested',  color: 'bg-purple-100 text-purple-800'},
  TRANSIT:   { label: 'In Transit', color: 'bg-orange-100 text-orange-800'},
  DELIVERED: { label: 'Delivered',  color: 'bg-green-100 text-green-800'  },
  CANCELLED: { label: 'Cancelled',  color: 'bg-red-100 text-red-800'      },
};

export const LISTING_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains & Cereals',
  'Dairy',
  'Livestock',
  'Poultry',
  'Herbs & Spices',
  'Farm Services',
  'Other',
];

export const UNITS = ['kg', 'g', 'litre', 'ml', 'dozen', 'piece', 'bag', 'bundle'];