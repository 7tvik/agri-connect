import { format, formatDistanceToNow, isPast } from 'date-fns';

export const formatDate = (date) => format(new Date(date), 'MMM dd, yyyy');

export const formatRelativeTime = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);

export const isExpired = (date) => isPast(new Date(date));

export const getInitials = (name) =>
  name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

export const truncate = (str, n = 100) =>
  str?.length > n ? str.slice(0, n) + '...' : str;