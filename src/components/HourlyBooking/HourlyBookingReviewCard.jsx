
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Calendar, Clock, Users, Hourglass, Info, Phone, PackagePlus } from 'lucide-react';
import { format as formatTz, utcToZonedTime } from 'date-fns-tz';
import PromoCodeInput from '@/components/BookingProcess/PromoCodeInput';

const HourlyBookingReviewCard = ({ details, rates, userId, userEmail, onCouponApplied, appliedCoupon, availableAddons, selectedAddons, onAddonsChange }) => {
  const { 
    serviceType, 
    derivedDates, 
    cleaners, 
    hours, 
    workCondition, 
    productName, 
    phone,
    dateTimeError,
    phoneError
  } = details;

  const isRatesMissing = !rates || !rates.pricePerCleaner;

  const calculatePrice = () => {
    if (isRatesMissing) return 0;
    let base = cleaners * hours * rates.pricePerCleaner;
    if (serviceType === 'Subscription' && rates.subscriptionRate && rates.subscriptionDiscount !== undefined) {
      // Calculate based on multiplier then apply discount
      const multipliedAmount = base * rates.subscriptionRate;
      const discount = multipliedAmount * (rates.subscriptionDiscount / 100);
      base = multipliedAmount - discount;
    }
    return base;
  };

  const basePrice = calculatePrice();
  
  // Calculate addons total
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = availableAddons?.find(a => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0);

  const totalPrice = basePrice + addonsTotal;

  const handleAddonToggle = (addonId) => {
    if (selectedAddons.includes(addonId)) {
      onAddonsChange(selectedAddons.filter(id => id !== addonId));
    } else {
      onAddonsChange([...selectedAddons, addonId]);
    }
  };

  let displayDate = '—';
  let displayTime = '—';

  if (derivedDates?.isoString) {
    try {
      const dateObj = new Date(derivedDates.isoString);
      const zonedDate = utcToZonedTime(dateObj, 'Asia/Bahrain');
      
      displayDate = formatTz(zonedDate, 'yyyy-MM-dd', { timeZone: 'Asia/Bahrain' });
      
      const endZoned = new Date(zonedDate.getTime() + hours * 60 * 60 * 1000);
      const startTimeStr = formatTz(zonedDate, 'hh:mm a', { timeZone: 'Asia/Bahrain' });
      const endTimeStr = formatTz(endZoned, 'hh:mm a', { timeZone: 'Asia/Bahrain' });
      displayTime = `${startTimeStr} - ${endTimeStr}`;

      console.log('[ReviewCard] Timezone conversion: Stored', derivedDates.isoString, '-> Bahrain Local:', displayDate, displayTime);
    } catch (err) {
       console.error('Time conversion error in review card:', err);
    }
  }

  return (
    <Card className="shadow-lg border-primary/20 bg-card/90 backdrop-blur-sm dark:bg-slate-800/90 dark:border-primary/50">
      <CardHeader className="border-b border-border pb-4 bg-muted/30">
        <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
          Booking Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isRatesMissing && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2 dark:bg-yellow-900/20 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Service rates are currently unavailable. Booking cannot be confirmed at this moment.
            </p>
          </div>
        )}

        {/* Read-Only Product Name */}
        <div className="mb-6 bg-muted/20 p-4 rounded-lg border border-border">
          <Label htmlFor="productName" className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-primary" /> Product Name
          </Label>
          <Input 
            id="productName"
            value={productName}
            readOnly
            disabled
            className="w-full bg-muted text-muted-foreground cursor-not-allowed border-transparent"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This name is generated automatically based on your service selections.
          </p>
        </div>

        <div className="space-y-4 text-sm mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</span>
            <span className="font-medium text-foreground text-right">{displayDate}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Time</span>
            <span className="font-medium text-foreground text-right">{displayTime}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Cleaners</span>
            <span className="font-medium text-foreground">{cleaners} Person(s)</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Hourglass className="h-4 w-4" /> Duration</span>
            <span className="font-medium text-foreground">{hours} Hour(s)</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Phone Number</span>
            <span className="font-medium text-foreground">{phone || 'Not provided'}</span>
          </div>
          {workCondition && (
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-2">Special Instructions</span>
              <span className="font-medium text-foreground truncate max-w-[140px] text-right" title={workCondition}>
                {workCondition}
              </span>
            </div>
          )}
        </div>

        {/* Promo Code Section */}
        <div className="mt-4">
          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Have a promo code?</Label>
          <PromoCodeInput
            bookingTotal={totalPrice}
            userId={userId}
            userEmail={userEmail}
            onCouponApplied={onCouponApplied}
          />
        </div>

        {/* Addons Section */}
        {availableAddons && availableAddons.length > 0 && (
          <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
            <Label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-primary" />
              Would you like to add-on?
            </Label>
            <div className="space-y-3">
              {availableAddons.map((addon) => (
                <div 
                  key={addon.id} 
                  className="flex items-center justify-between p-3 bg-background rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`addon-${addon.id}`}
                      checked={selectedAddons.includes(addon.id)}
                      onCheckedChange={() => handleAddonToggle(addon.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label 
                      htmlFor={`addon-${addon.id}`}
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      {addon.name}
                      {addon.description && (
                        <span className="block text-xs text-muted-foreground mt-0.5">{addon.description}</span>
                      )}
                    </label>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    +BHD {parseFloat(addon.price || 0).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">Base Rate</span>
            <span className="text-sm">BHD {(rates?.pricePerCleaner || 0).toFixed(3)} / cleaner / hr</span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">Service Subtotal</span>
            <span className="text-sm">BHD {basePrice.toFixed(3)}</span>
          </div>

          {addonsTotal > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-sm">Add-ons ({selectedAddons.length})</span>
              <span className="text-sm">+BHD {addonsTotal.toFixed(3)}</span>
            </div>
          )}
          
          {appliedCoupon && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-600 dark:text-green-400 text-sm">Discount ({appliedCoupon.coupon?.code})</span>
              <span className="text-green-600 dark:text-green-400 text-sm">-BHD {appliedCoupon.discountAmount.toFixed(3)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center border-t border-border/50 pt-3 mt-1">
            <span className="text-foreground font-semibold">Total Estimated</span>
            <span className="text-2xl font-bold text-primary dark:text-sky-400">
              {appliedCoupon 
                ? `BHD ${(totalPrice - appliedCoupon.discountAmount).toFixed(3)}`
                : totalPrice > 0 ? `BHD ${totalPrice.toFixed(3)}` : '--'
              }
            </span>
          </div>
          
          {serviceType === 'Subscription' && rates?.subscriptionRate && (
            <div className="flex justify-end mt-2">
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                Subscription Discount Applied (x{rates.subscriptionRate})
              </Badge>
            </div>
          )}
        </div>

        {/* Validation Errors displayed inline above the Confirm Button */}
        {(dateTimeError || phoneError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex flex-col gap-1 dark:bg-red-900/20 dark:border-red-800">
             {dateTimeError && (
               <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> {dateTimeError}
               </p>
             )}
             {phoneError && (
               <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> {phoneError}
               </p>
             )}
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default HourlyBookingReviewCard;
