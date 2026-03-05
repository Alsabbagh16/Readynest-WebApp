import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { applyCoupon } from '@/lib/couponUtils';
import { useToast } from '@/components/ui/use-toast';

const PromoCodeInput = ({ bookingTotal, userId, userEmail, onCouponApplied }) => {
  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) {
      setError('Please enter a promo code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await applyCoupon(promoCode.trim(), bookingTotal, userId, userEmail);

      if (result.isValid) {
        setAppliedCoupon({
          code: result.coupon.code,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          couponData: result.coupon
        });
        setError(null);
        
        toast({
          title: '✓ Coupon Applied!',
          description: `You saved BD ${result.discountAmount.toFixed(2)}`,
          className: 'bg-green-50 border-green-200'
        });

        if (onCouponApplied) {
          onCouponApplied({
            coupon: result.coupon,
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount
          });
        }
      } else {
        setError(result.error);
        setAppliedCoupon(null);
        
        toast({
          title: 'Invalid Coupon',
          description: result.error,
          variant: 'destructive'
        });

        if (onCouponApplied) {
          onCouponApplied(null);
        }
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      setError('An error occurred while validating the coupon');
      setAppliedCoupon(null);
      
      toast({
        title: 'Error',
        description: 'Failed to validate coupon. Please try again.',
        variant: 'destructive'
      });

      if (onCouponApplied) {
        onCouponApplied(null);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearCoupon = () => {
    setPromoCode('');
    setAppliedCoupon(null);
    setError(null);
    
    if (onCouponApplied) {
      onCouponApplied(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={isValidating || !!appliedCoupon}
            className={`pl-10 ${error ? 'border-red-500' : appliedCoupon ? 'border-green-500' : ''}`}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !appliedCoupon) {
                handleApplyCoupon();
              }
            }}
          />
        </div>
        
        {appliedCoupon ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleClearCoupon}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleApplyCoupon}
            disabled={isValidating || !promoCode.trim()}
            className="shrink-0"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {appliedCoupon && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Coupon <code className="bg-green-100 px-1.5 py-0.5 rounded font-mono">{appliedCoupon.code}</code> applied!
            </p>
            <p className="text-xs text-green-700 mt-1">
              You're saving BD {appliedCoupon.discountAmount.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;