import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format as formatTz, zonedTimeToUtc } from 'date-fns-tz';
import {
  ArrowLeft, Loader2, AlertCircle, ImageOff,
  CheckCircle2, Calendar, Clock, Package, DollarSign, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProductById } from '@/lib/storage/productStorage';
import { createPurchase } from '@/lib/storage/purchaseStorage';
import { validateBookingTime } from '@/lib/timeWindowValidator';
import SavedAddressSelector from '@/components/HourlyBooking/SavedAddressSelector';
import ManualAddressForm from '@/components/HourlyBooking/ManualAddressForm';
import TimePickerInput from '@/components/ui/TimePickerInput';

const ProductBookingPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, addresses, addAddress } = useAuth();

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState(null);

  const [dateTime, setDateTime] = useState('');
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [manualAddressData, setManualAddressData] = useState({});
  const [isManualAddressValid, setIsManualAddressValid] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState(null);

  const activePhone = useSavedAddress ? savedPhone : manualPhone;

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      setLoadingProduct(true);
      try {
        const data = await fetchProductById(productId);
        if (!data) throw new Error('Product not found');
        setProduct(data);
      } catch (err) {
        console.error('Error loading product:', err);
        setProductError(err.message);
      } finally {
        setLoadingProduct(false);
      }
    };
    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setUseSavedAddress(true);
    } else if (addresses && addresses.length === 0) {
      setUseSavedAddress(false);
    }
  }, [addresses, selectedAddressId]);

  const minDateTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minutesStr = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
  }, []);

  const derivedDates = useMemo(() => {
    if (!dateTime) return null;
    try {
      const timeZone = 'Asia/Bahrain';
      const utcDate = zonedTimeToUtc(dateTime, timeZone);
      if (isNaN(utcDate.getTime())) return null;
      const isoString = utcDate.toISOString();
      return {
        isoString,
        booking_date: formatTz(utcDate, 'MMMM d, yyyy', { timeZone }),
        booking_time: formatTz(utcDate, 'h:mm a', { timeZone }),
      };
    } catch {
      return null;
    }
  }, [dateTime]);

  const timeValidation = useMemo(() => {
    if (!dateTime) return { isValid: false, error: 'Please select a date and time.' };
    return validateBookingTime(dateTime);
  }, [dateTime]);

  const isFormValid =
    timeValidation.isValid &&
    derivedDates !== null &&
    (useSavedAddress ? !!selectedAddressId : isManualAddressValid) &&
    activePhone && activePhone.trim() !== '';

  const formatType = (type) => {
    if (type === 'one_time_service') return 'One-Time Service';
    if (type === 'recurring_service') return 'Recurring Service';
    return type;
  };

  const handleConfirmBooking = async () => {
    if (!isFormValid || !product) return;
    if (isSubmitting) return;

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in or create an account to book.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    let finalAddressData = null;
    if (!useSavedAddress) {
      finalAddressData = {
        street: manualAddressData.street,
        city: manualAddressData.city,
        zip_code: manualAddressData.apartment,
        phone: manualAddressData.phone,
        label: manualAddressData.label || 'Manual Address',
      };
      if (manualAddressData.saveForLater && user) {
        try {
          await addAddress(finalAddressData);
        } catch (err) {
          console.error('Failed to save address', err);
        }
      }
    } else {
      const savedAddr = addresses.find((a) => a.id === selectedAddressId);
      if (savedAddr) {
        finalAddressData = {
          street: savedAddr.street,
          city: savedAddr.city,
          zip_code: savedAddr.zip || savedAddr.zip_code,
          phone: savedAddr.phone,
        };
      }
    }

    const price = Number(product.price);

    const purchasePayload = {
      user_id: user.id,
      email: user.email || '',
      name: manualAddressData.fullName || user?.user_metadata?.full_name || 'Guest User',
      user_phone: activePhone,
      product_id: product.id,
      product_name: product.name,
      paid_amount: price,
      final_amount_due_on_arrival: price,
      status: 'Pending',
      payment_type: 'Cash on Arrival',
      address: finalAddressData,
      preferred_booking_date: derivedDates.isoString,
      scheduled_at: derivedDates.isoString,
      notes: manualAddressData.notes
        ? `User Note: ${manualAddressData.notes}\nDate: ${derivedDates.booking_date}, Time: ${derivedDates.booking_time}`
        : `Date: ${derivedDates.booking_date}, Time: ${derivedDates.booking_time}`,
      raw_selections: {
        productId: product.id,
        productName: product.name,
        productType: product.type,
        propertyType: product.property_type,
        derivedDates,
      },
      pricing_model: 'product',
    };

    try {
      const result = await createPurchase(purchasePayload);
      setConfirmationDetails({
        purchase_ref_id: result.purchase_ref_id,
        product_name: product.name,
        price,
        derivedDates,
      });
    } catch (error) {
      console.error('Purchase creation failed:', error);
      toast({
        title: 'Booking Failed',
        description: 'There was an error processing your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">{productError || 'The requested product could not be loaded.'}</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Complete Your Booking</h1>
          <p className="text-muted-foreground mt-1">Review your service and choose a date</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <Card className="overflow-hidden border">
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-48 h-48 sm:h-auto bg-muted shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5 flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {product.categories?.name && (
                      <Badge variant="secondary" className="text-xs">{product.categories.name}</Badge>
                    )}
                    <Badge className="bg-primary/10 text-primary text-xs border-0">{formatType(product.type)}</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">{product.name}</h2>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">BD {Number(product.price).toFixed(3)}</span>
                  </div>
                </CardContent>
              </div>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Preferred Date & Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <TimePickerInput
                    id="bookingDateTime"
                    label=""
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    min={minDateTime}
                    required
                  />
                  {!timeValidation.isValid && dateTime && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 dark:bg-red-900/20 dark:border-red-800">
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-400">{timeValidation.error}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Service Address</CardTitle>
              </CardHeader>
              <CardContent>
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
          </div>

          <div className="hidden lg:block lg:w-[360px]">
            <div className="lg:sticky lg:top-24">
              <Card className="border shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-foreground text-right max-w-[180px] truncate">{product.name}</span>
                  </div>

                  {derivedDates && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium text-foreground">{derivedDates.booking_date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium text-foreground">{derivedDates.booking_time}</span>
                      </div>
                    </>
                  )}

                  {activePhone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium text-foreground">{activePhone}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">BD {Number(product.price).toFixed(3)}</span>
                  </div>

                  <p className="text-xs text-muted-foreground">Payment: Cash on Arrival</p>

                  <Button
                    onClick={handleConfirmBooking}
                    size="lg"
                    className="w-full mt-2 font-semibold"
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-amber-600 font-medium">
                      You need to be logged in to book
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40 flex justify-between items-center">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-primary">BD {Number(product.price).toFixed(3)}</p>
        </div>
        <Button
          onClick={handleConfirmBooking}
          size="lg"
          className="px-8 shadow-md font-semibold"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Booking'}
        </Button>
      </div>

      {confirmationDetails && (
        <Dialog open={!!confirmationDetails} onOpenChange={(open) => !open && navigate('/account')}>
          <DialogContent className="sm:max-w-md bg-card border shadow-2xl">
            <DialogHeader className="text-center border-b pb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground text-center">Booking Confirmed!</DialogTitle>
              <DialogDescription className="text-center text-muted-foreground mt-2">
                Your booking has been successfully placed. We will contact you shortly.
              </DialogDescription>
            </DialogHeader>

            <Card className="bg-muted/30 p-4 rounded-lg border shadow-sm mt-4 space-y-3">
              {confirmationDetails.purchase_ref_id && (
                <div className="flex items-center text-sm pb-2 border-b">
                  <Hash className="h-4 w-4 text-primary mr-2" />
                  <span className="text-muted-foreground mr-2">Reference:</span>
                  <span className="font-mono font-medium text-foreground ml-auto bg-muted px-2 py-0.5 rounded">
                    {confirmationDetails.purchase_ref_id}
                  </span>
                </div>
              )}
              <div className="flex items-center text-sm pb-2 border-b">
                <Package className="h-4 w-4 text-primary mr-2 shrink-0" />
                <span className="text-muted-foreground mr-2">Service:</span>
                <span className="font-medium text-foreground ml-auto text-right truncate">
                  {confirmationDetails.product_name}
                </span>
              </div>
              {confirmationDetails.derivedDates && (
                <>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-primary mr-2" />
                    <span className="text-muted-foreground mr-2">Date:</span>
                    <span className="font-medium text-foreground ml-auto">
                      {confirmationDetails.derivedDates.booking_date}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 text-primary mr-2" />
                    <span className="text-muted-foreground mr-2">Time:</span>
                    <span className="font-medium text-foreground ml-auto">
                      {confirmationDetails.derivedDates.booking_time}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t pt-3 mt-1 flex items-center text-base font-bold">
                <DollarSign className="h-5 w-5 text-primary mr-1" />
                <span className="text-foreground">Total:</span>
                <span className="text-primary ml-auto">BD {confirmationDetails.price?.toFixed(3)}</span>
              </div>
            </Card>

            <DialogFooter className="mt-6 sm:justify-center">
              <Button onClick={() => navigate('/account')} className="w-full px-8 shadow-md">
                Go to Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductBookingPage;