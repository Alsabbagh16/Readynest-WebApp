
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceRates } from '@/hooks/useServiceRates';
import { Loader2, Calendar, Clock, Users, Hourglass, Info, Phone } from 'lucide-react';
import { format as formatTz, utcToZonedTime } from 'date-fns-tz';

const HourlyBookingSummary = ({ 
  serviceType, 
  subscriptionFrequency,
  derivedDates, 
  cleaners, 
  hours, 
  workCondition,
  phone,
  onContinue,
  isValid,
  t = (key) => key
}) => {
  const { rates, loading } = useServiceRates();

  const calculatePrice = () => {
    console.log('=== SUMMARY PRICE CALCULATION ===');
    console.log('subscriptionFrequency:', subscriptionFrequency);
    console.log('serviceType:', serviceType);
    console.log('rates:', rates);
    console.log('rates.twiceWeeklyMultiplier:', rates?.twiceWeeklyMultiplier);
    console.log('rates.subscriptionRate:', rates?.subscriptionRate);

    if (!rates.pricePerCleaner) return 0;
    let base = cleaners * hours * rates.pricePerCleaner;
    console.log('Base price (cleaners * hours * rate):', base);

    if (serviceType === 'Subscription' && rates.subscriptionDiscount !== undefined) {
      // Select multiplier based on frequency
      const multiplier = subscriptionFrequency === 'twice' 
        ? (rates.twiceWeeklyMultiplier || 1.8)
        : (rates.subscriptionRate || 1);

      console.log('Selected multiplier:', multiplier);
      console.log('Is twice weekly?:', subscriptionFrequency === 'twice');

      // Calculate based on multiplier then apply discount
      const multipliedAmount = base * multiplier;
      console.log('After multiplier:', multipliedAmount);

      const discount = multipliedAmount * (rates.subscriptionDiscount / 100);
      console.log('Discount:', discount);

      base = multipliedAmount - discount;
      console.log('Final price:', base);
    }

    return base;
  };

  const totalPrice = calculatePrice();

  // Calculate total cleans based on subscription frequency
  const totalCleans = serviceType === 'Subscription' 
    ? (subscriptionFrequency === 'twice' ? 8 : 4)
    : 1;

  // Calculate savings amount for subscription
  const calculateSavings = () => {
    if (!rates.pricePerCleaner || serviceType !== 'Subscription') return 0;
    
    const basePrice = cleaners * hours * rates.pricePerCleaner;
    
    // Select multiplier based on frequency
    const multiplier = subscriptionFrequency === 'twice' 
      ? (rates.twiceWeeklyMultiplier || 1.8)
      : (rates.subscriptionRate || 1);
    
    const multipliedAmount = basePrice * multiplier;
    const discount = multipliedAmount * (rates.subscriptionDiscount / 100);
    
    return discount;
  };

  const savingsAmount = calculateSavings();

  const serviceTypeLabel = serviceType === 'Subscription' ? t('booking.subscription') : t('booking.oneTime');

  let displayDate = '---';
  let displayTime = '---';

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
          {t('booking.summary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4 text-sm mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4" /> {t('booking.service')}</span>
            <span className="font-medium text-foreground">{serviceTypeLabel}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> {t('form.date')}</span>
            <span className="font-medium text-foreground text-right">{displayDate}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> {t('booking.time')}</span>
            <span className="font-medium text-foreground text-right">{displayTime}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> {t('booking.cleaners')}</span>
            <span className="font-medium text-foreground">
              {cleaners} {cleaners === 1 ? t('booking.cleaner') : t('booking.cleanersPlural')}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Hourglass className="h-4 w-4" /> {t('booking.duration')}</span>
            <span className="font-medium text-foreground">
              {hours} {hours === 1 ? t('booking.hour') : t('booking.hoursPlural')}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Total Cleaning Days</span>
            <span className="font-medium text-foreground">{totalCleans} Day{totalCleans !== 1 ? 's' : ''}</span>
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
            <span className="text-foreground font-semibold">{t('booking.totalEstimated')}</span>
            <span className="text-2xl font-bold text-primary dark:text-sky-400">
              {totalPrice > 0 ? `BHD ${totalPrice.toFixed(3)}` : '--'}
            </span>
          </div>
          {serviceType === 'Subscription' && rates.subscriptionRate && savingsAmount > 0 && (
            <div className="flex justify-end mt-2">
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                {t('booking.youSaved')}: BHD {savingsAmount.toFixed(3)}
              </Badge>
            </div>
          )}
        </div>

        <Button 
          className="w-full py-6 text-lg shadow-md bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold" 
          onClick={onContinue}
          disabled={!isValid}
        >
          {t('booking.continueToCheckout')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HourlyBookingSummary;
