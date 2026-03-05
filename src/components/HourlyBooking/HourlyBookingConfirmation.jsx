
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
import { CheckCircle2, Calendar, Clock, Package, DollarSign, Hash } from 'lucide-react';

const HourlyBookingConfirmation = ({ isOpen, onClose, details }) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    onClose();
    navigate('/account');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReturnHome()}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader className="text-center border-b border-border pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground text-center">Booking Confirmed!</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            Your hourly cleaning request has been successfully recorded. We will contact you shortly to finalize details.
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
            <span className="text-muted-foreground mr-2 shrink-0">Service:</span>
            <span className="font-medium text-foreground ml-auto text-right truncate" title={details?.product_name}>
              {details?.product_name}
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground mr-2">Date:</span>
            <span className="font-medium text-foreground ml-auto">{details?.derivedDates?.booking_date || 'N/A'}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-primary mr-2" />
            <span className="text-muted-foreground mr-2">Time:</span>
            <span className="font-medium text-foreground ml-auto">
              {details?.derivedDates ? `${details.derivedDates.booking_start_time} - ${details.derivedDates.booking_end_time}` : 'N/A'}
            </span>
          </div>

          <div className="border-t border-border pt-3 mt-1 flex items-center text-base font-bold">
            <DollarSign className="h-5 w-5 text-primary mr-1" />
            <span className="text-foreground">Total:</span>
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
