// src/components/common/StatusBadge.jsx
import { ORDER_STATUS } from '../../utils/constants';

const StatusBadge = ({ status }) => {
  const config = ORDER_STATUS[status?.toUpperCase()] || {
    label: status,
    color: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`badge ${config.color}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;