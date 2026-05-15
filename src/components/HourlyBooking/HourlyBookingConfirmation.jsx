
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, Package, Hash } from 'lucide-react';

const HourlyBookingConfirmation = ({ isOpen, onClose, details, t = (key) => key }) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReturnHome()}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader className="text-center border-b border-border pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground text-center">{t('booking.confirmed')}!</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            {t('booking.confirmationSubtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <Card className="bg-muted/30 p-4 rounded-lg border border-border shadow-sm mt-4 space-y-3">
          {details?.purchase_ref_id && (
            <div className="flex items-center text-sm pb-2 border-b border-border/50">
              <Hash className="h-4 w-4 text-primary mr-2" />
              <span className="text-muted-foreground mr-2">Reference ID:</span>
              <span className="font-mono font-medium text-foreground ml-auto bg-muted px-2 py-0.5 rounded">{details.purchase_ref_id}</span>
            </div>
          )}

          <div className="flex items-center text-sm pb-2 border-b border-border/50">
            <Package className="h-4 w-4 text-primary mr-2 shrink-0" />
            <span className="text-muted-foreground mr-2 shrink-0">{t('booking.service')}:</span>
            <span className="font-medium text-foreground ml-auto text-right truncate" title={details?.product_name}>
              {details?.product_name}
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground mr-2">{t('form.date')}:</span>
            <span className="font-medium text-foreground ml-auto">{details?.derivedDates?.booking_date || 'N/A'}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground mr-2">{t('booking.time')}:</span>
            <span className="font-medium text-foreground ml-auto">
              {details?.derivedDates ? `${details.derivedDates.booking_start_time} - ${details.derivedDates.booking_end_time}` : 'N/A'}
            </span>
          </div>

          {details?.addons && details.addons.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">{t('booking.addons')}:</span>
              <div className="mt-1 space-y-1">
                {details.addons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-foreground">{addon.name}</span>
                    <span className="text-muted-foreground">+BHD {parseFloat(addon.price).toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details?.coupon && details?.discount > 0 && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <span className="text-muted-foreground mr-2">{t('booking.coupon')} ({details.coupon}):</span>
              <span className="font-medium ml-auto">-BHD {details.discount.toFixed(3)}</span>
            </div>
          )}

          <div className="border-t border-border pt-3 mt-1 flex items-center text-base font-bold">
            <span className="text-foreground">{t('booking.totalEstimated')}:</span>
            <span className="text-primary dark:text-sky-400 ml-auto">BHD {details?.price?.toFixed(3)}</span>
          </div>
        </Card>

        <DialogFooter className="mt-6 sm:justify-center">
          <Button 
            type="button" 
            onClick={handleReturnHome} 
            className="w-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-sky-500 dark:hover:bg-sky-600 shadow-md"
          >
            Go to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HourlyBookingConfirmation;
