import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { applyCoupon } from '@/lib/couponUtils';
import { useToast } from '@/components/ui/use-toast';

const PromoCodeInput = ({ bookingTotal, userId, userEmail, onCouponApplied, t = (key) => key }) => {
  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) {
      setError(t('booking.pleaseEnterPromoCode'));
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
          couponData: result.coupon,
        });
        setError(null);

        toast({
          title: `✓ ${t('booking.couponApplied')}`,
          description: `${t('booking.youSaved')} BD ${result.discountAmount.toFixed(2)}`,
          className: 'bg-green-50 border-green-200',
        });

        onCouponApplied?.({
          coupon: result.coupon,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
        });
      } else {
        setError(result.error);
        setAppliedCoupon(null);

        toast({
          title: t('booking.invalidCoupon'),
          description: result.error,
          variant: 'destructive',
        });

        onCouponApplied?.(null);
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      setError(t('booking.couponError'));
      setAppliedCoupon(null);

      toast({
        title: t('booking.error'),
        description: t('booking.validationFailed'),
        variant: 'destructive',
      });

      onCouponApplied?.(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearCoupon = () => {
    setPromoCode('');
    setAppliedCoupon(null);
    setError(null);
    onCouponApplied?.(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('booking.promoCodePlaceholder')}
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
          <Button type="button" variant="outline" onClick={handleClearCoupon} className="shrink-0">
            <X className="mr-1 h-4 w-4" />
            {t('booking.remove')}
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
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                {t('booking.checking')}
              </>
            ) : (
              t('booking.apply')
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {appliedCoupon && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              {t('booking.coupon')}{' '}
              <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono">{appliedCoupon.code}</code>{' '}
              {t('booking.applied')}!
            </p>
            <p className="mt-1 text-xs text-green-700">
              {t('booking.youreSaving')} BD {appliedCoupon.discountAmount.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;
