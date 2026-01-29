import React from 'react';
import { QuoteStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface StatusBadgeProps {
  status: QuoteStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colorClasses = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${colorClasses}`}>
      {status}
    </span>
  );
};

export default StatusBadge;