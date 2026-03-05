import React from 'react';
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCcw } from 'lucide-react';

const ServiceActions = ({ booking, onCancel, onRefund, disabled }) => {
  const isRefundable = booking.status !== 'refunded' && booking.status !== 'quote_requested'; // Can't refund quotes or already refunded
  const isCancellable = booking.status !== 'cancelled' && booking.serviceStatus !== 'Cancelled' && booking.status !== 'refunded';

  return (
    <div className="pt-4 border-t space-y-2">
        <h3 className="font-semibold text-lg pb-2">Manage Booking</h3>
        <Button
           variant="outline"
           size="sm"
           onClick={onRefund}
           disabled={disabled || !isRefundable}
           className="w-full text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:text-gray-400 disabled:border-gray-300 disabled:bg-gray-50"
        >
           <RefreshCcw className="h-4 w-4 mr-2" /> Issue Refund {booking.paidWithCredits > 0 ? '(+ Credits)' : ''}
        </Button>
        <Button
           variant="destructive"
           size="sm"
           onClick={onCancel}
           disabled={disabled || !isCancellable}
           className="w-full"
        >
           <XCircle className="h-4 w-4 mr-2" /> Cancel Service
        </Button>
    </div>
  );
};

export default ServiceActions;