
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, Clock, Users, Hourglass, Info, Phone } from 'lucide-react';
import { format as formatTz, utcToZonedTime } from 'date-fns-tz';

const HourlyBookingReviewCard = ({ details, rates }) => {
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

  const totalPrice = calculatePrice();

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
        
        <div className="bg-muted/30 p-4 rounded-lg border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">Base Rate</span>
            <span className="text-sm">BHD {(rates?.pricePerCleaner || 0).toFixed(3)} / cleaner / hr</span>
          </div>
          
          <div className="flex justify-between items-center border-t border-border/50 pt-3 mt-1">
            <span className="text-foreground font-semibold">Total Estimated</span>
            <span className="text-2xl font-bold text-primary dark:text-sky-400">
              {totalPrice > 0 ? `BHD ${totalPrice.toFixed(3)}` : '--'}
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
