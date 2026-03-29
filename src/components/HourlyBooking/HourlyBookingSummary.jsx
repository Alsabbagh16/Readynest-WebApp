
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceRates } from '@/hooks/useServiceRates';
import { Loader2, Calendar, Clock, Users, Hourglass, Info, Phone } from 'lucide-react';
import { format as formatTz, utcToZonedTime } from 'date-fns-tz';

const HourlyBookingSummary = ({ 
  serviceType, 
  derivedDates, 
  cleaners, 
  hours, 
  workCondition,
  phone,
  onContinue,
  isValid 
}) => {
  const { rates, loading } = useServiceRates();

  const calculatePrice = () => {
    if (!rates.pricePerCleaner) return 0;
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
      displayTime = formatTz(zonedDate, 'hh:mm a', { timeZone: 'Asia/Bahrain' });
      
      console.log('[Summary] Timezone conversion: Stored', derivedDates.isoString, '-> Bahrain Local:', displayDate, displayTime);
    } catch (err) {
       console.error('Time conversion error in summary:', err);
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-8 flex justify-center items-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-primary/20 bg-card/90 backdrop-blur-sm dark:bg-slate-800/90 dark:border-primary/50">
      <CardHeader className="border-b border-border pb-4 bg-muted/30">
        <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
          Booking Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4 text-sm mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4" /> Type</span>
            <span className="font-medium text-foreground">{serviceType}</span>
          </div>
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
          {phone && (
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</span>
              <span className="font-medium text-foreground">{phone}</span>
            </div>
          )}
          {workCondition && (
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-2">Work Conditions</span>
              <span className="font-medium text-foreground text-right" title={workCondition}>
                {workCondition}
              </span>
            </div>
          )}
        </div>
        
        <div className="bg-muted/30 p-4 rounded-lg border border-border mb-6">
          <div className="flex justify-between items-center">
            <span className="text-foreground font-semibold">Total Estimated</span>
            <span className="text-2xl font-bold text-primary dark:text-sky-400">
              {totalPrice > 0 ? `BHD ${totalPrice.toFixed(3)}` : '--'}
            </span>
          </div>
          {serviceType === 'Subscription' && rates.subscriptionRate && (
            <div className="flex justify-end mt-2">
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                Subscription Discount Applied
              </Badge>
            </div>
          )}
        </div>

        <Button 
          className="w-full py-6 text-lg shadow-md bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold" 
          onClick={onContinue}
          disabled={!isValid}
        >
          Continue to Checkout
        </Button>
      </CardContent>
    </Card>
  );
};

export default HourlyBookingSummary;
