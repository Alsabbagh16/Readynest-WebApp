
import React, { useState, useMemo, useEffect } from 'react';
import { Users, Hourglass, Plus, Minus, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { format as formatTz, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import HourlyBookingHeroSection from '@/components/HourlyBooking/HourlyBookingHeroSection';
import HourlyBookingSummary from '@/components/HourlyBooking/HourlyBookingSummary';
import HourlyBookingConfirmation from '@/components/HourlyBooking/HourlyBookingConfirmation';
import HourlyBookingReviewCard from '@/components/HourlyBooking/HourlyBookingReviewCard';
import SavedAddressSelector from '@/components/HourlyBooking/SavedAddressSelector';
import ManualAddressForm from '@/components/HourlyBooking/ManualAddressForm';
import TimePickerInput from '@/components/ui/TimePickerInput';
import { useServiceRates } from '@/hooks/useServiceRates';
import { validateBookingTime } from '@/lib/timeWindowValidator';
import { useAuth } from '@/contexts/AuthContext';
import { createPurchase } from '@/lib/storage/purchaseStorage';
import { sendPurchaseNotification } from '@/lib/whatsappService';
import { supabase } from '@/lib/supabase';

const HourlyBookingPage = () => {
  const { rates, loading: loadingRates } = useServiceRates();
  const { user, addresses, addAddress } = useAuth();
  const { toast } = useToast();
  
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState(null);
  const [submitError, setSubmitError] = useState(''); // Inline submission error state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Step A: Inputs State
  const [serviceType, setServiceType] = useState('One-Time');
  const [dateTime, setDateTime] = useState('');
  const [cleaners, setCleaners] = useState(1);
  const [hours, setHours] = useState(rates?.minHours || 1);
  const [workCondition, setWorkCondition] = useState('');

  // Step B: Address & Phone State
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [manualAddressData, setManualAddressData] = useState({});
  const [isManualAddressValid, setIsManualAddressValid] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Derived Phone
  const activePhone = useSavedAddress ? savedPhone : manualPhone;

  // Validation States for Confirm Action
  const [dateTimeError, setDateTimeError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Coupon State
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Addons State
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Initialize minimum allowed date for picker
  const minDateTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minutesStr = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
  }, []);

  // Sync hours if service rates load slower and ensure minimum
  useEffect(() => {
    if (rates.minHours && hours < rates.minHours) {
      setHours(rates.minHours);
    }
  }, [rates.minHours, hours]);

  // Fetch active addons
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const { data, error } = await supabase
          .from('addon_templates')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (error) throw error;
        setAvailableAddons(data || []);
      } catch (err) {
        console.error('Error fetching addons:', err);
      }
    };
    fetchAddons();
  }, []);

  // Save booking details to sessionStorage when user needs to auth
  const saveBookingDetails = () => {
    const bookingData = {
      serviceType,
      dateTime,
      cleaners,
      hours,
      workCondition,
      useSavedAddress,
      selectedAddressId,
      manualAddressData,
      isManualAddressValid,
      savedPhone,
      manualPhone,
      currentStep: 2 // We want to return to step 2
    };
    console.log('Saving booking data:', bookingData);
    sessionStorage.setItem('hourlyBookingPending', JSON.stringify(bookingData));
  };

  // Handle Google login with booking data preservation
  const handleGoogleLogin = async () => {
    console.log('Starting Google login from hourly booking...');
    
    // Save booking details to both sessionStorage and localStorage for reliability
    const bookingData = {
      serviceType,
      dateTime,
      cleaners,
      hours,
      workCondition,
      useSavedAddress,
      selectedAddressId,
      manualAddressData,
      isManualAddressValid,
      savedPhone,
      manualPhone,
      currentStep: 2
    };
    
    // Use localStorage instead of sessionStorage for Google OAuth
    // sessionStorage doesn't persist across domain redirects
    localStorage.setItem('hourlyBookingPending', JSON.stringify(bookingData));
    localStorage.setItem('postLoginRedirect', '/hourlybooking');
    console.log('Stored booking data and redirect in localStorage');
    
    // Initiate Google OAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      console.error('Google login error:', error);
      toast({
        title: "Google Sign-In Error",
        description: error.message,
        variant: "destructive"
      });
      // Clean up on error
      localStorage.removeItem('hourlyBookingPending');
      localStorage.removeItem('postLoginRedirect');
    }
  };

  // Restore booking details from localStorage or sessionStorage
  const restoreBookingDetails = () => {
    // Check localStorage first (used for Google OAuth), then sessionStorage
    let saved = localStorage.getItem('hourlyBookingPending');
    let storageType = 'localStorage';
    
    if (!saved) {
      saved = sessionStorage.getItem('hourlyBookingPending');
      storageType = 'sessionStorage';
    }
    
    if (saved) {
      try {
        const bookingData = JSON.parse(saved);
        console.log(`Restoring booking data from ${storageType}:`, bookingData);
        setServiceType(bookingData.serviceType || 'One-Time');
        setDateTime(bookingData.dateTime || '');
        setCleaners(bookingData.cleaners || 1);
        // Use the saved hours directly, don't fall back to minHours
        if (bookingData.hours) {
          setHours(bookingData.hours);
        }
        setWorkCondition(bookingData.workCondition || '');
        setUseSavedAddress(bookingData.useSavedAddress !== false);
        setSelectedAddressId(bookingData.selectedAddressId);
        setManualAddressData(bookingData.manualAddressData || {});
        setIsManualAddressValid(bookingData.isManualAddressValid || false);
        setSavedPhone(bookingData.savedPhone || '');
        setManualPhone(bookingData.manualPhone || '');
        setCurrentStep(bookingData.currentStep || 2);
        
        // Clear the saved data after restoring from both storages
        localStorage.removeItem('hourlyBookingPending');
        sessionStorage.removeItem('hourlyBookingPending');
        return true;
      } catch (e) {
        console.error('Error restoring booking details:', e);
        localStorage.removeItem('hourlyBookingPending');
        sessionStorage.removeItem('hourlyBookingPending');
      }
    }
    return false;
  };

  // Check for saved booking details on component mount or when user logs in
  useEffect(() => {
    const pendingBookingLocal = localStorage.getItem('hourlyBookingPending');
    const pendingBookingSession = sessionStorage.getItem('hourlyBookingPending');
    console.log('[HourlyBooking] Checking for pending booking - user:', !!user, 'localStorage:', !!pendingBookingLocal, 'sessionStorage:', !!pendingBookingSession);
    
    if (pendingBookingLocal || pendingBookingSession) {
      // Restore booking details regardless of user state
      // This handles the case where user just logged in via Google
      const wasRestored = restoreBookingDetails();
      console.log('[HourlyBooking] Restore result:', wasRestored);
    }
  }, [user]); // Run when user state changes (e.g., after Google login)

  // Show auth modal for non-authenticated users when entering step 2
  useEffect(() => {
    if (currentStep === 2 && !user) {
      setShowAuthModal(true);
    }
  }, [currentStep, user]);

  // Set default address if available
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setUseSavedAddress(true);
    } else if (addresses && addresses.length === 0) {
      setUseSavedAddress(false);
    }
  }, [addresses, selectedAddressId]);

  // Auto-derived Product Name
  const derivedProductName = useMemo(() => {
    const hourStr = hours === 1 ? 'Hour' : 'Hours';
    const cleanerStr = cleaners === 1 ? 'Cleaner' : 'Cleaners';
    const formattedServiceType = serviceType === 'One-Time' ? 'One Time' : 'Subscription';
    return `Hourly ${formattedServiceType} - ${hours} ${hourStr}, ${cleaners} ${cleanerStr}`;
  }, [serviceType, hours, cleaners]);

  // Derived Dates Calculation safely guarded and timezone-aware
  const derivedDates = useMemo(() => {
    if (!dateTime) return null;
    try {
      const timeZone = 'Asia/Bahrain';
      // Treat the local input string explicitly as Bahrain time -> convert to actual UTC Date
      const utcDate = zonedTimeToUtc(dateTime, timeZone);
      if (isNaN(utcDate.getTime())) return null;
      
      const isoString = utcDate.toISOString();
      const endUtcDate = new Date(utcDate.getTime() + hours * 60 * 60 * 1000);

      // Dev logging
      const bahrainFmt = formatTz(utcDate, "yyyy-MM-dd HH:mm:ssXXX", { timeZone });
      const offset = formatTz(utcDate, "XXX", { timeZone });
      console.log('--- Timezone Conversion Debug ---');
      console.log('1. Selected date/time string:', dateTime);
      console.log('2. Computed timezone-aware datetime in Asia/Bahrain:', bahrainFmt);
      console.log('3. Stored ISO string:', isoString);
      console.log('4. Confirmation of no offset discrepancy: Offset is', offset);
      console.log('---------------------------------');

      return {
        isoString,
        booking_date: formatTz(utcDate, 'MMMM d, yyyy', { timeZone }),
        booking_start_time: formatTz(utcDate, 'h:mm a', { timeZone }),
        booking_end_time: formatTz(endUtcDate, 'h:mm a', { timeZone }),
        original_datetime: dateTime
      };
    } catch (e) {
      return null;
    }
  }, [dateTime, hours]);

  // Validation Logic for Step A
  const timeValidation = useMemo(() => {
    if (!dateTime) return { isValid: false, error: 'Please select a date and time.' };
    return validateBookingTime(dateTime);
  }, [dateTime]);

  const isStep1Valid = timeValidation.isValid && dateTime !== '' && derivedDates !== null;

  // Validation Logic for Step B
  const isRatesValid = rates && rates.pricePerCleaner;
  const isStep2Valid = isRatesValid && (useSavedAddress ? !!selectedAddressId : isManualAddressValid) && isStep1Valid;

  // Inline Validation Effects before Confirm
  useEffect(() => {
    if (currentStep === 2) {
      if (!derivedDates) {
        setDateTimeError('Please select a valid booking date and time.');
      } else {
        setDateTimeError('');
      }

      if (!activePhone || activePhone.trim() === '') {
        setPhoneError('Phone number is required.');
      } else {
        setPhoneError('');
      }
    }
  }, [derivedDates, activePhone, currentStep]);

  const calculatePrice = () => {
    if (!rates || !rates.pricePerCleaner) return 0;
    let base = cleaners * hours * rates.pricePerCleaner;
    if (serviceType === 'Subscription' && rates.subscriptionRate && rates.subscriptionDiscount !== undefined) {
      // Calculate based on multiplier then apply discount
      const multipliedAmount = base * rates.subscriptionRate;
      const discount = multipliedAmount * (rates.subscriptionDiscount / 100);
      base = multipliedAmount - discount;
    }
    return base;
  };

  const handleContinueToReview = () => {
    if (!isStep1Valid) return;
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToInputs = () => {
    setSubmitError('');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    setSubmitError('');
    let hasError = false;
    
    // Safely validate the date object
    const dateObj = derivedDates ? new Date(derivedDates.isoString) : null;
    if (!derivedDates || !dateObj || isNaN(dateObj.getTime())) {
      setDateTimeError('Please select a valid booking date and time.');
      hasError = true;
    } else {
      setDateTimeError('');
    }

    if (!activePhone || activePhone.trim() === '') {
      setPhoneError('Phone number is required.');
      hasError = true;
    }
    if (!isStep2Valid) {
      hasError = true;
    }

    if (hasError) {
      toast({
        title: "Validation Error",
        description: "Please check the required fields before confirming.",
        variant: "destructive"
      });
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    
    let finalAddressData = null;

    if (!useSavedAddress) {
      finalAddressData = {
        street: manualAddressData.street,
        city: manualAddressData.city,
        zip_code: manualAddressData.apartment,
        phone: manualAddressData.phone,
        label: manualAddressData.label || 'Manual Address'
      };

      if (manualAddressData.saveForLater && user) {
        try {
          await addAddress(finalAddressData);
        } catch (addrErr) {
          console.error("Failed to save address for later", addrErr);
        }
      }
    } else {
      const savedAddr = addresses.find(a => a.id === selectedAddressId);
      if (savedAddr) {
        finalAddressData = {
          street: savedAddr.street,
          city: savedAddr.city,
          zip_code: savedAddr.zip || savedAddr.zip_code,
          phone: savedAddr.phone
        };
      }
    }

    const basePrice = calculatePrice();
    
    // Calculate addons total
    const addonsTotal = selectedAddons.reduce((sum, addonId) => {
      const addon = availableAddons.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);
    
    const priceWithAddons = basePrice + addonsTotal;
    const finalPrice = appliedCoupon ? (priceWithAddons - appliedCoupon.discountAmount) : priceWithAddons;
    const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    
    // Get selected addon details for storage
    const selectedAddonDetails = selectedAddons.map(addonId => {
      const addon = availableAddons.find(a => a.id === addonId);
      return addon ? { id: addon.id, name: addon.name, price: addon.price } : null;
    }).filter(Boolean);
    
    const humanReadableNotes = [
      manualAddressData.notes ? `User Note: ${manualAddressData.notes}` : '',
      `Date: ${derivedDates.booking_date}`,
      `Time: ${derivedDates.booking_start_time} to ${derivedDates.booking_end_time}`
    ].filter(Boolean).join('\n');

    const purchasePayload = {
      user_id: user?.id || null,
      email: user?.email || manualAddressData.email || `guest-${Date.now()}@readynest.com`, // Use manual email if provided, otherwise placeholder
      name: manualAddressData.fullName || user?.user_metadata?.full_name || 'Guest User',
      user_phone: activePhone,
      product_name: derivedProductName,
      paid_amount: finalPrice,
      final_amount_due_on_arrival: finalPrice,
      status: 'Pending',
      payment_type: 'Cash on Arrival',
      address: finalAddressData,
      preferred_booking_date: derivedDates.isoString, // Required for admin source of truth
      scheduled_at: derivedDates.isoString, 
      notes: humanReadableNotes,
      
      // Storing specific hourly booking details in raw_selections
      raw_selections: {
        serviceType,
        cleaners,
        hours,
        workCondition,
        ratesSnapshot: rates,
        derivedDates,
        selectedAddons: selectedAddonDetails
      },
      
      // Map top-level fields for reporting
      cleaners_count: cleaners,
      hours: hours,
      hourly_rate_used: rates.pricePerCleaner,
      rate_multiplier_used: rates.subscriptionRate,
      pricing_model: 'hourly',
      
      // Coupon data
      coupon_code: appliedCoupon?.coupon?.code || null,
      coupon_id: appliedCoupon?.coupon?.id || null,
      discount_amount: discountAmount,
      original_amount: basePrice,
      
      // Addons data
      addons: selectedAddonDetails,
      addons_total: addonsTotal
    };

    // Logging as requested
    console.log('Validated bookingDatetime:', dateObj);
    console.log('ISO string output:', derivedDates.isoString);
    console.log('Computed final product name value:', derivedProductName);
    console.log('Exact purchase payload before insert:', purchasePayload);

    try {
      const result = await createPurchase(purchasePayload);
      
      console.log('Purchase created successfully! ID:', result.purchase_ref_id);
      console.log('Stored preferred_booking_date in DB:', result.preferred_booking_date);

      // Send WhatsApp notification (non-blocking)
      sendPurchaseNotification({
        customerName: purchasePayload.name,
        customerPhone: purchasePayload.user_phone,
        bookingDate: derivedDates.booking_date,
        bookingTime: `${derivedDates.booking_start_time} - ${derivedDates.booking_end_time}`,
        amount: finalPrice.toString(),
        referenceId: result.purchase_ref_id
      }).catch(err => console.error('WhatsApp notification failed:', err));

      // Send email confirmation (non-blocking)
      supabase.functions.invoke('send-purchase-confirmation', {
        body: {
          record: {
            purchase_ref_id: result.purchase_ref_id,
            name: purchasePayload.name,
            email: purchasePayload.email,
            user_phone: purchasePayload.user_phone,
            product_name: derivedProductName,
            paid_amount: finalPrice,
            booking_date: derivedDates.booking_date,
            booking_start_time: derivedDates.booking_start_time,
            booking_end_time: derivedDates.booking_end_time,
            address: purchasePayload.address,
            cleaners: cleaners,
            hours: hours
          }
        }
      }).catch(err => console.error('Email notification failed:', err));

      setConfirmationDetails({
        purchase_ref_id: result.purchase_ref_id,
        serviceType,
        derivedDates,
        cleaners,
        hours,
        price: finalPrice,
        product_name: derivedProductName,
        coupon: appliedCoupon?.coupon?.code || null,
        discount: discountAmount,
        originalPrice: basePrice,
        addons: selectedAddonDetails,
        addonsTotal: addonsTotal
      });

    } catch (error) {
      console.error("Purchase creation failed:", error);
      console.error("Failed payload:", purchasePayload);
      setSubmitError("There was an error processing your booking. Please check your details and try again.");
      toast({
        title: "Booking Failed",
        description: "There was an error processing your request.",
        variant: "destructive"
      });
      // Deliberately not changing step to keep user on current screen
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCleaners = (delta) => {
    setCleaners(prev => Math.min(Math.max(1, prev + delta), rates.maxCleaners || 4));
  };

  const updateHours = (delta) => {
    setHours(prev => Math.min(Math.max(rates.minHours || 1, prev + delta), 12));
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      {/* {currentStep === 1 && <HourlyBookingHeroSection />} */}

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        
        {/* Main Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Book Your Cleaning</h1>
          <p className="text-lg text-muted-foreground">Schedule your professional cleaning service in just a few steps</p>
        </div>
        
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center max-w-xl mx-auto">
          <div className="flex items-center w-full">
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors", currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</div>
            <div className={cn("flex-1 h-1 mx-2 transition-colors", currentStep >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors", currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</div>
          </div>
        </div>

        {currentStep === 1 && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-left-4 fade-in duration-300">
            {/* Step A Main Form */}
            <div className="flex-1 space-y-8">
              
              {/* Service Type Toggle */}
              <Card className="shadow-md border-border dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-foreground tracking-tight">How Often Would You Like Us To Visit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex rounded-lg overflow-hidden border border-border p-1 bg-muted/50 dark:bg-slate-900/50">
                    {['One-Time', 'Subscription'].map(type => (
                      <button
                        key={type}
                        onClick={() => setServiceType(type)}
                        className={cn(
                          "flex-1 py-3 text-sm font-medium rounded-md transition-all duration-200",
                          serviceType === type 
                            ? "bg-background shadow-sm text-primary border border-border dark:bg-slate-700 dark:text-sky-400" 
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Date & Time */}
              <Card className="shadow-md border-border dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-foreground tracking-tight">When do you need us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xl">
                    <TimePickerInput
                      id="bookingDateTime"
                      label="Preferred Date & Time"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      onBlur={() => {
                        if (!derivedDates) setDateTimeError('Please select a valid booking date and time.');
                      }}
                      min={minDateTime}
                      required
                    />
                    {!timeValidation.isValid && dateTime && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 dark:bg-red-900/20 dark:border-red-800">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {timeValidation.error || "Please select a valid time within operating hours."}
                        </p>
                      </div>
                    )}
                    {dateTime && derivedDates === null && timeValidation.isValid && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 dark:bg-red-900/20 dark:border-red-800">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                          Invalid date or time selected.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cleaners & Hours */}
              <Card className="shadow-md border-border dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-foreground tracking-tight">How Many Cleaners & Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-semibold flex items-center text-foreground">
                        <Users className="mr-2 h-5 w-5 text-primary dark:text-sky-400"/> Number of Cleaners
                      </Label>
                      <span className="text-sm font-medium text-muted-foreground">Max {rates.maxCleaners || 4}</span>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border shadow-inner">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-background" onClick={() => updateCleaners(-1)} disabled={cleaners <= 1}>
                        <Minus className="h-5 w-5 text-foreground" />
                      </Button>
                      <div className="text-3xl font-extrabold w-16 text-center text-foreground">{cleaners}</div>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-background" onClick={() => updateCleaners(1)} disabled={cleaners >= (rates.maxCleaners || 4)}>
                        <Plus className="h-5 w-5 text-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-semibold flex items-center text-foreground">
                        <Hourglass className="mr-2 h-5 w-5 text-primary dark:text-sky-400"/> Hours Required
                      </Label>
                      <span className="text-sm font-medium text-muted-foreground">Min {rates.minHours || 1} - Max 12</span>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border shadow-inner">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-background" onClick={() => updateHours(-1)} disabled={hours <= (rates.minHours || 1)}>
                        <Minus className="h-5 w-5 text-foreground" />
                      </Button>
                      <div className="text-3xl font-extrabold w-16 text-center text-foreground">{hours}</div>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-background" onClick={() => updateHours(1)} disabled={hours >= 12}>
                        <Plus className="h-5 w-5 text-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Conditions */}
              <Card className="shadow-md border-border dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Special Instructions (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input 
                    placeholder="e.g., Please clean under the furniture, Extra attention to kitchen..." 
                    value={workCondition}
                    onChange={(e) => setWorkCondition(e.target.value)}
                    className="w-full text-base h-12 bg-background border-border"
                  />
                </CardContent>
              </Card>

            </div>

            {/* Desktop Summary Sidebar (Step A) */}
            <div className="hidden lg:block w-[400px]">
              <div className="sticky top-24">
                <HourlyBookingSummary 
                  serviceType={serviceType}
                  derivedDates={derivedDates}
                  cleaners={cleaners}
                  hours={hours}
                  workCondition={workCondition}
                  phone={activePhone}
                  onContinue={handleContinueToReview}
                  isValid={isStep1Valid}
                />
              </div>
            </div>
            
            {/* Mobile Sticky Bottom Bar (Step A) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40 flex justify-between items-center dark:bg-slate-900/95">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Total</p>
                <p className="text-2xl font-extrabold text-primary dark:text-sky-400">BHD {calculatePrice().toFixed(3)}</p>
              </div>
              <Button 
                onClick={handleContinueToReview} 
                size="lg" 
                className="px-8 shadow-md bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold"
                disabled={!isStep1Valid}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
            <Button variant="ghost" onClick={handleBackToInputs} className="mb-2 -ml-4 hover:bg-muted/50">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to details
            </Button>

            <Card className="shadow-md border-border dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
                <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Service Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {useSavedAddress ? (
                  <SavedAddressSelector 
                    selectedAddressId={selectedAddressId}
                    onSelect={(id) => setSelectedAddressId(id)}
                    onAddNew={() => setUseSavedAddress(false)}
                    onAddressPhoneChange={setSavedPhone}
                  />
                ) : (
                  <ManualAddressForm 
                    onCancel={addresses && addresses.length > 0 ? () => setUseSavedAddress(true) : null}
                    onChange={(data, valid) => {
                      setManualAddressData(data);
                      setIsManualAddressValid(valid);
                    }}
                    onManualPhoneChange={setManualPhone}
                    defaultValues={manualAddressData}
                  />
                )}
              </CardContent>
            </Card>

            <HourlyBookingReviewCard 
              details={{ 
                serviceType, 
                derivedDates, 
                cleaners, 
                hours, 
                workCondition,
                productName: derivedProductName,
                phone: activePhone,
                dateTimeError,
                phoneError
              }}
              rates={rates}
              userId={user?.id}
              userEmail={user?.email}
              onCouponApplied={setAppliedCoupon}
              appliedCoupon={appliedCoupon}
              availableAddons={availableAddons}
              selectedAddons={selectedAddons}
              onAddonsChange={setSelectedAddons}
            />
            
            {submitError && (
               <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 dark:bg-red-900/20 dark:border-red-800">
                 <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                 <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                   {submitError}
                 </p>
               </div>
            )}

            <Button 
              onClick={handleConfirmBooking} 
              size="lg" 
              className="w-full py-8 text-xl shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-sky-500 dark:hover:bg-sky-600 font-bold tracking-wide transition-all active:scale-[0.98]"
              disabled={!isStep2Valid || isSubmitting || !!dateTimeError || !!phoneError}
            >
              {isSubmitting ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Processing your booking...</> : 'Confirm Booking'}
            </Button>
          </div>
        )}
      </div>

      {confirmationDetails && (
        <HourlyBookingConfirmation 
          isOpen={!!confirmationDetails} 
          onClose={() => setConfirmationDetails(null)}
          details={confirmationDetails}
        />
      )}

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Log in or Continue as guest</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose how you'd like to proceed with your booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button className="w-full" size="sm" onClick={() => {
              saveBookingDetails();
              window.location.href = '/auth?redirect=/hourlybooking';
            }}>
              Log in or register
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button 
              className="w-full" 
              size="sm" 
              variant="outline"
              onClick={handleGoogleLogin}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowAuthModal(false)}
            >
              Continue as Guest
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed text-center">
              Continue without an account. Your service address will be used to collect your information.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HourlyBookingPage;
