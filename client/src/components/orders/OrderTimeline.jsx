// src/components/orders/OrderTimeline.jsx
// This component shows the visual progress of an order status
import { formatRelativeTime } from '../../utils/helpers';
import { Check } from 'lucide-react';

// Status steps in order
const STEPS = [
  { key: 'pending',    label: 'Order Placed',   icon: '📋' },
  { key: 'confirmed',  label: 'Confirmed',       icon: '✅' },
  { key: 'harvested',  label: 'Harvested',       icon: '🌾' },
  { key: 'in_transit', label: 'In Transit',      icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',       icon: '📦' },
];

const OrderTimeline = ({ currentStatus, statusHistory = [] }) => {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-medium text-red-700">Order Cancelled</p>
          <p className="text-xs text-red-500">
            {statusHistory.find(h => h.status === 'cancelled')?.note || ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, index) => {
        const isDone    = index < currentIdx;
        const isCurrent = index === currentIdx;
        const isPending = index > currentIdx;

        // Find history entry for this step
        const historyEntry = statusHistory.find((h) => h.status === step.key);

        return (
          <div key={step.key} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-all ${
                isDone    ? 'bg-primary-600 text-white'      :
                isCurrent ? 'bg-primary-100 border-2 border-primary-600 text-primary-600' :
                            'bg-gray-100 text-gray-300'
              }`}>
                {isDone ? <Check size={14} /> : step.icon}
              </div>
              {/* Vertical line (not on last step) */}
              {index < STEPS.length - 1 && (
                <div className={`w-0.5 h-8 mt-1 ${isDone ? 'bg-primary-300' : 'bg-gray-200'}`} />
              )}
            </div>

            {/* Step label */}
            <div className="pb-6 flex-1">
              <p className={`text-sm font-medium ${
                isCurrent ? 'text-primary-700' :
                isDone    ? 'text-gray-700'    :
                            'text-gray-300'
              }`}>
                {step.label}
                {isCurrent && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </p>
              {historyEntry && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {historyEntry.note && `${historyEntry.note} · `}
                  {formatRelativeTime(historyEntry.updatedAt)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;