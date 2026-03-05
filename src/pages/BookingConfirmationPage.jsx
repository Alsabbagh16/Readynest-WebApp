import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FolderHeart as HomeIcon, ShoppingBag, Phone, MapPin, User, DollarSign, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const BookingConfirmationPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { purchaseDetails } = location.state || {};

  // Scroll to top when the page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Clean the date string to remove timezone offset information (Z or +00:00)
      // This ensures the date is parsed as local time ("wall clock" time) 
      // preserving the exact time selected by the user regardless of browser timezone
      const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
      const date = new Date(cleanDateString);
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMM d, yyyy, h:mm a');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'N/A';
    }
  };

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30 dark:bg-slate-800/80 dark:border-primary/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-destructive">Oops! Something went wrong.</CardTitle>
              <CardDescription className="text-muted-foreground">
                We couldn't find your booking details. Please try booking again or contact support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link to="/hourlybooking">Book Again</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const {
    purchase_ref_id,
    product_name,
    paid_amount, // This is Base Amount (original price)
    coupon_code,
    discount_amount, 
    final_amount_due_on_arrival, // This is Final Total
    name,
    email,
    user_phone, // The user/contact person phone
    address,    // The address object (contains location phone)
    preferred_booking_date,
    additional_preferred_dates,
    selected_addons
  } = purchaseDetails;

  const displayAddress = typeof address === 'string' ? address :
    `${address?.street || ''}, ${address?.city || ''}, ${address?.state || ''} ${address?.zip || ''}`.replace(/, , /, ', ').trim();


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30 dark:bg-slate-800/80 dark:border-primary/50">
          <CardHeader className="text-center border-b border-border pb-6 dark:border-slate-700">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            >
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            </motion.div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground dark:text-white">Booking Confirmed!</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground dark:text-slate-400">
              Thank you, {name || 'Valued Customer'}! Your cleaning service is scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Your Purchase Reference ID:</p>
              <p className="text-2xl font-semibold text-primary dark:text-sky-400 tracking-wider">{purchase_ref_id}</p>
            </div>

            <div className="space-y-3 p-4 border border-border rounded-lg bg-background/50 dark:bg-slate-700/40 dark:border-slate-600">
              <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-primary dark:text-sky-400" />
                Service Details
              </h3>
              <div className="text-sm space-y-1">
                <p><strong className="text-muted-foreground dark:text-slate-300">Service:</strong> {product_name || 'Custom Cleaning Service'}</p>
                {selected_addons && selected_addons.length > 0 && (
                  <div>
                    <strong className="text-muted-foreground dark:text-slate-300">Add-ons:</strong>
                    <ul className="list-disc list-inside ml-4">
                      {selected_addons.map(addon => <li key={addon.id}>{addon.name}</li>)}
                    </ul>
                  </div>
                )}
                
                {/* Pricing Breakdown */}
                <div className="mt-4 pt-2 border-t border-border/50 space-y-1">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground dark:text-slate-300">Base Amount:</span>
                      <span className="font-medium">BHD {Number(paid_amount).toFixed(3)}</span>
                   </div>
                   
                   {Number(discount_amount) > 0 && (
                     <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                        <span className="flex items-center">
                          <Tag className="h-3 w-3 mr-1" /> 
                          Discount {coupon_code && <Badge variant="outline" className="ml-1 text-xs border-green-200 text-green-700 h-5 px-1">{coupon_code}</Badge>}:
                        </span>
                        <span className="font-medium">- BHD {Number(discount_amount).toFixed(3)}</span>
                     </div>
                   )}
                   
                   <div className="flex justify-between items-center text-base font-bold mt-2 pt-2 border-t border-dashed border-border/50">
                      <span className="flex items-center"><DollarSign className="h-4 w-4 mr-1 text-primary" /> Final Amount Due on Arrival:</span>
                      <span className="text-primary dark:text-sky-400">BHD {Number(final_amount_due_on_arrival).toFixed(3)}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 border border-border rounded-lg bg-background/50 dark:bg-slate-700/40 dark:border-slate-600">
              <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center">
                <HomeIcon className="h-5 w-5 mr-2 text-primary dark:text-sky-400" />
                Booking Information
              </h3>
              <div className="text-sm space-y-2">
                <div className="flex items-start">
                  <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p><strong className="text-muted-foreground dark:text-slate-300">Contact:</strong> {name}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground">{user_phone} <span className="opacity-70">(User Phone)</span></p>
                  </div>
                </div>

                <div className="border-t border-border/50 my-2"></div>

                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p><strong className="text-muted-foreground dark:text-slate-300">Location:</strong></p>
                    <p>{displayAddress}</p>
                    {address?.phone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center">
                        <Phone className="h-3 w-3 mr-1" /> {address.phone} <span className="opacity-70 ml-1">(Address Phone)</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/50 my-2"></div>

                <p><strong className="text-muted-foreground dark:text-slate-300">Preferred Date 1:</strong> {formatDateTime(preferred_booking_date)}</p>
                {additional_preferred_dates && (
                  <>
                    {additional_preferred_dates.date2 && <p><strong className="text-muted-foreground dark:text-slate-300">Preferred Date 2:</strong> {formatDateTime(additional_preferred_dates.date2)}</p>}
                    {additional_preferred_dates.date3 && <p><strong className="text-muted-foreground dark:text-slate-300">Preferred Date 3:</strong> {formatDateTime(additional_preferred_dates.date3)}</p>}
                    {additional_preferred_dates.date4 && <p><strong className="text-muted-foreground dark:text-slate-300">Preferred Date 4:</strong> {formatDateTime(additional_preferred_dates.date4)}</p>}
                  </>
                )}
                <p className="text-xs text-muted-foreground pt-2 dark:text-slate-400">A team member will contact you shortly to confirm the exact time and details.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-sky-500 dark:hover:bg-sky-600">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 dark:border-sky-400 dark:text-sky-400 dark:hover:bg-sky-400/10">
                <Link to={user ? "/account" : "/auth"}>Go to Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BookingConfirmationPage;