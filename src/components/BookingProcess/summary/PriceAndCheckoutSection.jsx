import React from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Loader2, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PriceAndCheckoutSection = ({ 
  basePrice, 
  discountAmount = 0, 
  finalAmountDueOnArrival, 
  onProceedToCheckout, 
  isProceedDisabled, 
  isTimeValid = true,
  isSubmitting 
}) => {
  const { loading: authLoading } = useAuth();
  
  const hasDiscount = discountAmount > 0;
  
  return (
    <div className="pt-6 border-t border-border dark:border-slate-700">
      <div className="space-y-3 mb-4">
        {/* Base Amount */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Base Amount:</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            BD {basePrice.toFixed(2)}
          </p>
        </div>

        {/* Discount Amount */}
        {hasDiscount && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              Discount:
            </p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              - BD {discountAmount.toFixed(2)}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-slate-600 my-2"></div>

        {/* Final Amount Due on Arrival */}
        <div className="flex justify-between items-center">
          <p className="text-xl font-bold text-foreground flex items-center dark:text-white">
            <DollarSign className="h-5 w-5 mr-1 text-primary dark:text-sky-400" /> 
            Amount Due on Arrival:
          </p>
          <p className={`text-2xl font-extrabold ${hasDiscount ? 'text-green-600 dark:text-green-400' : 'text-primary dark:text-sky-400'}`}>
            BD {finalAmountDueOnArrival.toFixed(2)}
          </p>
        </div>

        {hasDiscount && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            You saved BD {discountAmount.toFixed(2)}!
          </p>
        )}
      </div>

      <Button 
        onClick={onProceedToCheckout} 
        size="lg" 
        className="w-full text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-white py-3 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isProceedDisabled || !isTimeValid || authLoading || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-5 w-5" /> Confirm Booking
          </>
        )}
      </Button>
      {(isProceedDisabled && !authLoading && !isSubmitting) && (
        <p className="text-xs text-center mt-2 text-muted-foreground dark:text-slate-400">
            {!isTimeValid ? "Please select a valid time between 08:30 and 17:00." : "Please login, register, or continue as guest and fill required fields to proceed."}
        </p>
      )}
    </div>
  );
};

export default PriceAndCheckoutSection;