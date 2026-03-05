import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { validateBookingTime } from '@/lib/timeWindowValidator';

import UserDetailsSection from './summary/UserDetailsSection';
import BookingItemsSection from './summary/BookingItemsSection';
import BookingDateSection from './summary/BookingDateSection';
import PriceAndCheckoutSection from './summary/PriceAndCheckoutSection';
import PromoCodeInput from './PromoCodeInput';
import { calculateBookingPrice } from './summary/priceCalculator';
import { buildPurchaseData } from './summary/checkoutHelper';
import { recordCouponRedemption } from '@/lib/couponUtils';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const BookingSummaryPage = ({ addonTemplates: allAddonTemplates }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  const { toast } = useToast();
  const { user, profile, addresses } = useAuth();
  const { selections, matchedProduct, loadingProductMatch, resetSelections: resetBookingContextSelections, dateTime, setDateTime, bookingDates, updateBookingDate, prefilledData } = useBooking();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [guestDetails, setGuestDetails] = useState({
    fullName: '', email: '', phone: '', street: '', city: '', state: '', zip: ''
  });
  
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isGuestFlowActive, setIsGuestFlowActive] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [currentAddonTemplates, setCurrentAddonTemplates] = useState([]);

  // Coupon state
  const [appliedCouponData, setAppliedCouponData] = useState(null);

  // Client-side time validation state
  // We compute this on every render or use a memo, since dateTime comes from context
  const timeValidation = dateTime ? validateBookingTime(dateTime) : { isValid: false, error: 'Time is required' };
  const isTimeValid = timeValidation.isValid;

  useEffect(() => {
    if (user && addresses && addresses.length > 0) {
      if (prefilledData?.addressId && addresses.some(a => a.id === prefilledData.addressId)) {
        setSelectedAddressId(prefilledData.addressId);
      } else {
        const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
        if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
        }
      }
    }
  }, [user, addresses, prefilledData]);

  useEffect(() => {
    if (matchedProduct && matchedProduct.linked_addons) {
      setCurrentAddonTemplates(matchedProduct.linked_addons);
      
      const availableAddonIds = matchedProduct.linked_addons.map(a => a.id);
      
      setSelectedAddons(prev => {
        if (prev.length === 0 && prefilledData?.addons?.length > 0) {
           return prefilledData.addons.filter(id => availableAddonIds.includes(id));
        }
        return prev.filter(addonId => availableAddonIds.includes(addonId));
      });
      
    } else {
      setCurrentAddonTemplates(allAddonTemplates || []);
      if (prefilledData?.addons?.length > 0 && selectedAddons.length === 0) {
         setSelectedAddons(prefilledData.addons);
      }
    }
  }, [matchedProduct, allAddonTemplates, prefilledData]);

  const handleAddonToggle = useCallback((addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  }, []);

  const handleGuestDetailsChange = useCallback((newDetails) => {
    setGuestDetails(newDetails);
    if (Object.values(newDetails).some(val => val !== '')) {
        setIsGuestFlowActive(true); 
    }
  }, []);
  
  const handleAddressSelect = useCallback((addressId) => {
    setSelectedAddressId(addressId);
  }, []);

  const handleBookingDateChange = useCallback((val) => {
    // Direct update to Single Source of Truth
    setDateTime(val);
  }, [setDateTime]);

  const handleAdditionalBookingDateChange = useCallback((dateKey, value) => {
    updateBookingDate(dateKey, value);
  }, [updateBookingDate]);

  const handleCouponApplied = useCallback((couponData) => {
    setAppliedCouponData(couponData);
  }, []);

  const basePrice = calculateBookingPrice(selections, matchedProduct, selectedAddons, currentAddonTemplates);
  
  const discountAmount = appliedCouponData?.discountAmount || 0;
  const finalAmountDueOnArrival = appliedCouponData?.finalAmount || basePrice;

  const isCheckoutDisabled = () => {
    if (loadingProductMatch || isSubmitting) return true;
    
    // Strict Check on dateTime existence
    if (!dateTime) return true;
    
    // Strict Client-Side Validation Check
    // If client-side validation fails, disable checkout
    if (!isTimeValid) return true;

    if (selections.cleaningType === 'recurring') {
      if (!bookingDates.date2 || !bookingDates.date3 || !bookingDates.date4) return true;
      if (!validateBookingTime(bookingDates.date2).isValid) return true;
      if (!validateBookingTime(bookingDates.date3).isValid) return true;
      if (!validateBookingTime(bookingDates.date4).isValid) return true;
    }

    if (user) {
      return !selectedAddressId;
    }
    if (isGuestFlowActive) { 
        const requiredGuestFields = ['fullName', 'email', 'phone', 'street', 'city', 'state', 'zip'];
        for (const field of requiredGuestFields) {
            if (!guestDetails[field]) return true;
        }
        return false; 
    }
    return true; 
  };

  const handleProceedToCheckout = async () => {
    // 1. Validate dateTime existence and basic validity (Client-Side)
    if (!dateTime || !isTimeValid) {
        toast({ 
            title: "Invalid Time", 
            description: timeValidation.error || "Please choose a time between 08:30 and 17:00.", 
            variant: "destructive" 
        });
        return;
    }
    
    if (isCheckoutDisabled()) {
        toast({ title: "Missing Information", description: "Please complete all required fields and ensure times are valid.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    
    // Ensure "Face Value" storage by appending Z if needed
    // This tells the DB to store the string digits as-is in UTC column
    const formattedDateTime = dateTime.endsWith('Z') ? dateTime : `${dateTime}:00Z`;

    const additionalDatesObj = {
        date2: bookingDates.date2 ? (bookingDates.date2.endsWith('Z') ? bookingDates.date2 : `${bookingDates.date2}:00Z`) : null,
        date3: bookingDates.date3 ? (bookingDates.date3.endsWith('Z') ? bookingDates.date3 : `${bookingDates.date3}:00Z`) : null,
        date4: bookingDates.date4 ? (bookingDates.date4.endsWith('Z') ? bookingDates.date4 : `${bookingDates.date4}:00Z`) : null
    };

    const purchaseData = buildPurchaseData(
      selections, matchedProduct, selectedAddons, currentAddonTemplates, 
      formattedDateTime, // Pass formatted Z string
      additionalDatesObj, basePrice, 
      user, profile, addresses, selectedAddressId, 
      isGuestFlowActive, guestDetails,
      appliedCouponData
    );

    purchaseData.notes = specialInstructions;

    console.log("Attempting to save purchase:", purchaseData);

    try {
      const { data: insertedPurchase, error } = await supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single();

      if (error) {
        console.error("Error saving purchase:", error);
        toast({
          title: "Booking Failed",
          description: `Could not save your booking. ${error.message}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (appliedCouponData) {
        try {
          const redemptionResult = await recordCouponRedemption(
            appliedCouponData.coupon.id,
            user?.id || null,
            isGuestFlowActive ? guestDetails.email : (user?.email || profile?.email),
            isGuestFlowActive ? guestDetails.phone : profile?.phone
          );

          if (redemptionResult.error) {
            console.warn("Coupon redemption recording warning:", redemptionResult.error);
          }
        } catch (couponError) {
          console.error("Critical error in coupon recording:", couponError);
        }
      }
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
          body: { record: insertedPurchase }
        });
        
        if (emailError) {
          console.error("Email sending failed:", emailError);
        }
      } catch (emailException) {
        console.error("Unexpected error triggering email:", emailException);
      }

      const successMessage = appliedCouponData 
        ? `Booking submitted! You saved BD ${discountAmount.toFixed(2)} with coupon ${appliedCouponData.coupon.code}.`
        : "Your booking request has been submitted.";

      toast({
        title: "Booking Submitted!",
        description: successMessage,
      });
      
      resetBookingContextSelections();
      setSelectedAddons([]);
      setGuestDetails({ fullName: '', email: '', phone: '', street: '', city: '', state: '', zip: '' });
      setSelectedAddressId(null);
      setSpecialInstructions('');
      setIsGuestFlowActive(false);
      setAppliedCouponData(null);

      navigate('/booking-confirmation', { state: { purchaseDetails: insertedPurchase } });

    } catch (e) {
      console.error("Unexpected error during checkout:", e);
      toast({
        title: "Booking Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProductMatchStatus = () => {
    if (loadingProductMatch) {
      return (
        <div className="flex items-center justify-center text-primary dark:text-sky-400 p-3 bg-blue-100/50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md text-sm">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Matching your service...
        </div>
      );
    }
    if (matchedProduct) {
      return (
        <div className="p-3 bg-green-100 border border-green-300 rounded-md text-green-700 text-sm dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
          Service: {matchedProduct.name} (Price: BD {Number(matchedProduct.price).toFixed(2)})
        </div>
      );
    }
    if ((selections.propertyType === 'home' || selections.propertyType === 'airbnb') && !matchedProduct && !selections.planId) {
      return (
         <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-sm dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
          No direct product match found. Price estimated. Proceeding with general booking.
        </div>
      );
    }
     if (selections.planId && !matchedProduct?.isPlanBased && !matchedProduct?.id) {
       return (
         <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-sm dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
          Using plan details. Specific product for this size not found, price based on plan.
        </div>
       );
    }
    return null;
  };

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
      <Card className="bg-card/90 backdrop-blur-sm shadow-xl border-primary/30 dark:bg-slate-800/80 dark:border-primary/50">
        <CardHeader className="text-center border-b border-border pb-6 dark:border-slate-700">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}>
            <ClipboardCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl dark:text-white">Booking Summary</CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground dark:text-slate-400">Review your selections before proceeding.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {renderProductMatchStatus()}

          <BookingItemsSection 
            selections={selections} 
            addonTemplates={currentAddonTemplates} 
            selectedAddons={selectedAddons}
            onAddonToggle={handleAddonToggle}
            matchedProduct={matchedProduct}
          />
          <UserDetailsSection 
            onAddressSelect={handleAddressSelect}
            onGuestDetailsChange={handleGuestDetailsChange}
            currentSelectedAddressId={selectedAddressId}
            currentGuestDetails={guestDetails}
            onIsGuestFlowActiveChange={setIsGuestFlowActive}
          />
          
          <div>
            <BookingDateSection 
                bookingDate={dateTime}
                onBookingDateChange={handleBookingDateChange}
                additionalBookingDates={{
                    date2: bookingDates.date2,
                    date3: bookingDates.date3,
                    date4: bookingDates.date4
                }}
                onAdditionalBookingDateChange={handleAdditionalBookingDateChange}
                cleaningType={selections.cleaningType}
                specialInstructions={specialInstructions}
                onSpecialInstructionsChange={setSpecialInstructions}
            />
            {!isTimeValid && dateTime && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-center">
                    <p className="text-red-600 text-sm font-semibold">
                        {timeValidation.error || "Time Slot Invalid. Please choose a time between 08:30 and 17:00."}
                    </p>
                </div>
            )}
          </div>

          <div className="pt-4 border-t border-border dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Have a Promo Code?</h3>
            <PromoCodeInput
              bookingTotal={basePrice}
              userId={user?.id}
              userEmail={isGuestFlowActive ? guestDetails.email : (user?.email || profile?.email)}
              onCouponApplied={handleCouponApplied}
            />
          </div>

          <PriceAndCheckoutSection 
            basePrice={basePrice}
            discountAmount={discountAmount}
            finalAmountDueOnArrival={finalAmountDueOnArrival}
            onProceedToCheckout={handleProceedToCheckout}
            isProceedDisabled={isCheckoutDisabled()}
            isTimeValid={isTimeValid}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingSummaryPage;