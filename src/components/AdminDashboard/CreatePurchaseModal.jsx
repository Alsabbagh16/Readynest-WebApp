
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ChevronDown, Check, Users, Clock } from 'lucide-react';
import CustomerSelector from './CustomerSelector';
import { useCustomerAutoFill } from '@/hooks/useCustomerAutoFill';
import { createPurchase } from '@/lib/storage/purchaseStorage';
import { fetchServiceRates, calculateHourlyAmount } from '@/lib/serviceRatesUtils';
import { cn } from '@/lib/utils';

const CreatePurchaseModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [serviceRates, setServiceRates] = useState(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const { toast } = useToast();

  // Hourly service optional fields
  const [hourlyService, setHourlyService] = useState({
    cleaners: '',
    hours: '',
    isSubscription: false
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    productId: 'custom',
    amount: '',
    paymentType: 'Cash',
    status: 'Pending',
    preferred_booking_date: '',
    customer_id: null,
    user_id: null,
    address_street: '',
    address_city: '',
    address_zip: '',
    address_phone: '',
    address_alt_phone: ''
  });

  const { loadingAutoFill } = useCustomerAutoFill(formData.customer_id, setFormData);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchServiceRatesData();
      setRecoveryMessage('');
    }
  }, [isOpen]);

  // Recalculate amount when hourly service fields change
  useEffect(() => {
    if (hourlyService.cleaners && hourlyService.hours && serviceRates) {
      const cleaners = Number(hourlyService.cleaners);
      const hours = Number(hourlyService.hours);
      
      if (cleaners > 0 && hours > 0) {
        const calculatedAmount = calculateHourlyAmount(
          cleaners,
          hours,
          hourlyService.isSubscription,
          serviceRates
        );
        setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
      }
    }
  }, [hourlyService.cleaners, hourlyService.hours, hourlyService.isSubscription, serviceRates]);

  const fetchServiceRatesData = async () => {
    const rates = await fetchServiceRates();
    setServiceRates(rates);
    
    // Recalculate amount if hourly service fields are already filled
    if (rates && hourlyService.cleaners && hourlyService.hours) {
      const calculatedAmount = calculateHourlyAmount(
        hourlyService.cleaners,
        hourlyService.hours,
        hourlyService.isSubscription,
        rates
      );
      setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, price').eq('isActive', true);
    if (data) setProducts(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerSelect = (customerId) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }));
  };

  const handleHourlyServiceChange = (field, value) => {
    // Convert string values to numbers properly
    const numValue = field === 'isSubscription' ? value : (value === '' ? '' : Number(value));
    
    // Update the state first
    setHourlyService(prev => {
      const updatedService = {
        ...prev,
        [field]: numValue
      };
      
      // Auto-calculate amount when hourly service fields are filled
      if (updatedService.cleaners && updatedService.hours && serviceRates) {
        const calculatedAmount = calculateHourlyAmount(
          Number(updatedService.cleaners),
          Number(updatedService.hours),
          updatedService.isSubscription,
          serviceRates
        );
        setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
      }
      
      return updatedService;
    });
  };

  const handleProductChange = (value) => {
    if (value === 'custom') {
      setFormData(prev => ({
        ...prev,
        productId: 'custom',
      }));
    } else {
      const product = products.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        productId: value,
        amount: product ? product.price : prev.amount
      }));
    }
    setDropdownOpen(false);
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRecoveryMessage('');

    try {
      if (!formData.name || !formData.email) {
        throw new Error("Please fill in required fields (Name, Email).");
      }

      const isCustom = formData.productId === 'custom' || !formData.productId;
      const product = !isCustom ? products.find(p => p.id === formData.productId) : null;

      let isoDate = null;
      if (formData.preferred_booking_date) {
        const d = new Date(formData.preferred_booking_date);
        if (!isNaN(d.getTime())) {
          isoDate = d.toISOString();
        }
      }

      const purchasePayload = {
        customer_id: formData.customer_id,
        user_id: formData.user_id || formData.customer_id,
        email: formData.email,
        name: formData.name,
        user_phone: formData.phone,
        product_id: isCustom ? null : formData.productId,
        product_name: isCustom ? (() => {
          const hours = hourlyService.hours || 1;
          const cleaners = hourlyService.cleaners || 1;
          const hourStr = hours === 1 ? 'Hour' : 'Hours';
          const cleanerStr = cleaners === 1 ? 'Cleaner' : 'Cleaners';
          const formattedServiceType = hourlyService.isSubscription ? 'Subscription' : 'One Time';
          return `Hourly ${formattedServiceType} - ${hours} ${hourStr}, ${cleaners} ${cleanerStr}`;
        })() : (product?.name || 'Unknown Product'),
        paid_amount: formData.amount,
        final_amount_due_on_arrival: formData.amount,
        payment_type: formData.paymentType,
        status: formData.status,
        preferred_booking_date: isoDate,
        scheduled_at: isoDate,
        address: {
          street: formData.address_street,
          city: formData.address_city,
          zip: formData.address_zip,
          phone: formData.address_phone,
          alt_phone: formData.address_alt_phone
        }
      };

      console.log("1. Before Insert - Validated bookingDatetime:", isoDate);
      console.log("2. Before Insert - Payload:", purchasePayload);

      const result = await createPurchase(purchasePayload);

      console.log("3. Captured Returned Row from Insert:", {
        id: result.purchase_ref_id,
        preferred_booking_date: result.preferred_booking_date,
        created_at: result.created_at,
        full_row: result
      });

      // 4. Follow-up Verification
      if (isoDate) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('purchases')
          .select('purchase_ref_id, preferred_booking_date, created_at')
          .eq('purchase_ref_id', result.purchase_ref_id)
          .single();

        if (verifyError) {
          console.error("Verification select error:", verifyError);
        } else {
          console.log("5. Verification Row:", verifyData);

          // 6. Null Detection
          if (!verifyData.preferred_booking_date) {
            console.log("6. DB-side overwrite detected. preferred_booking_date is null in DB.");
            
            // 7. Fallback Update & User Messaging
            setRecoveryMessage("Booking date wasn't persisted. Attempting recovery...");
            
            console.log(`7. Fallback Update - Attempting to SET preferred_booking_date = ${isoDate}`);
            const { error: updateError } = await supabase
              .from('purchases')
              .update({ preferred_booking_date: isoDate, scheduled_at: isoDate })
              .eq('purchase_ref_id', result.purchase_ref_id);

            if (updateError) {
              console.error("Fallback update error:", updateError);
            }

            const { data: reVerifyData, error: reVerifyError } = await supabase
              .from('purchases')
              .select('purchase_ref_id, preferred_booking_date, created_at')
              .eq('purchase_ref_id', result.purchase_ref_id)
              .single();

            console.log("7. Final Re-verify Row:", reVerifyData);
            
            if (reVerifyError || !reVerifyData?.preferred_booking_date) {
               console.warn("WARNING: Re-select still shows null for preferred_booking_date after fallback update.");
            }
          }
        }
      }

      toast({ title: "Success", description: "Purchase created successfully." });
      setRecoveryMessage('');
      onSuccess();
      onClose();
      
      // Reset Form
      setFormData({
        name: '', email: '', phone: '', productId: 'custom', amount: '', paymentType: 'Cash', status: 'Pending', preferred_booking_date: '',
        customer_id: null, user_id: null, address_street: '', address_city: '', address_zip: '', address_phone: '', address_alt_phone: ''
      });
      setHourlyService({
        cleaners: '',
        hours: '',
        isSubscription: false
      });
    } catch (error) {
      console.error("9. Error handling in handleSubmit:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      // We don't crash UI, we keep the user on form.
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = formData.productId === 'custom'
    ? { name: 'Custom purchase (No product)' }
    : products.find(p => p.id === formData.productId);

  // Custom Product Dropdown (non-portal approach)
  const ProductDropdown = () => {
    if (!dropdownOpen || !triggerRef.current) return null;

    return (
      <div
        ref={dropdownRef}
        className="absolute bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden z-50"
        style={{
          top: '100%',
          left: '0',
          right: '0',
          marginTop: '4px'
        }}
      >
        <div className="p-2 border-b">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>

        <div
          className="overflow-y-auto"
          style={{
            maxHeight: '250px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="p-1">
            <button
              onClick={() => handleProductChange('custom')}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors flex items-center justify-between border-b mb-1",
                formData.productId === 'custom' && "bg-slate-50"
              )}
            >
              <span className="font-medium">Custom purchase (No product)</span>
              {formData.productId === 'custom' && <Check className="h-4 w-4 text-primary" />}
            </button>

            {filteredProducts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No products found
              </div>
            ) : (
              filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProductChange(p.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors flex items-center justify-between",
                    formData.productId === p.id && "bg-slate-50"
                  )}
                >
                  <span>{p.name} - BHD {p.price}</span>
                  {formData.productId === p.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Purchase</DialogTitle>
          <DialogDescription>
            Manually record a purchase. Select a customer to auto-fill details.
          </DialogDescription>
        </DialogHeader>

        {recoveryMessage && (
           <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md mb-2 flex items-center shadow-sm">
             <Loader2 className="h-4 w-4 mr-2 animate-spin text-yellow-600" />
             {recoveryMessage}
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4">

          <div className="space-y-2 p-3 bg-slate-50 rounded-md border">
            <Label>Select Customer (Optional Auto-fill)</Label>
            <CustomerSelector
              selectedCustomerId={formData.customer_id}
              onCustomerSelect={handleCustomerSelect}
            />
            {loadingAutoFill && <p className="text-xs text-muted-foreground animate-pulse">Loading customer details...</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="preferred_booking_date">Preferred Booking Date</Label>
            <Input
              id="preferred_booking_date"
              name="preferred_booking_date"
              type="datetime-local"
              value={formData.preferred_booking_date}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2 border-t pt-2 mt-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Address Details</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input name="address_street" placeholder="Street" value={formData.address_street} onChange={handleChange} className="col-span-2 text-sm" />
              <Input name="address_city" placeholder="City" value={formData.address_city} onChange={handleChange} className="text-sm" />
              <Input name="address_zip" placeholder="Zip/Block" value={formData.address_zip} onChange={handleChange} className="text-sm" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-2 mt-2 relative">
            <Label htmlFor="product">Product (Optional)</Label>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={!selectedProduct ? 'text-muted-foreground' : ''}>
                {selectedProduct?.name || 'Select a product'}
              </span>
              <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", dropdownOpen && "rotate-180")} />
            </button>
            <ProductDropdown />
          </div>

          {/* Optional Hourly Service Fields */}
          <div className="space-y-4 border-t pt-4 mt-4">
            <div className="text-sm font-medium text-slate-700">Hourly Service Options (Optional)</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cleaners" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Cleaners
                </Label>
                <Input
                  id="cleaners"
                  type="number"
                  min="1"
                  max="10"
                  value={hourlyService.cleaners}
                  onChange={(e) => handleHourlyServiceChange('cleaners', e.target.value)}
                  placeholder="Number of cleaners"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hours" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="12"
                  value={hourlyService.hours}
                  onChange={(e) => handleHourlyServiceChange('hours', e.target.value)}
                  placeholder="Number of hours"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Subscription
                </Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="subscription"
                    checked={hourlyService.isSubscription}
                    onCheckedChange={(checked) => handleHourlyServiceChange('isSubscription', checked)}
                  />
                  <Label htmlFor="subscription" className="text-sm">
                    Apply subscription rate
                  </Label>
                </div>
              </div>
            </div>
            
            {serviceRates && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                <div className="grid grid-cols-2 gap-2">
                <div>Standard Rate: BHD {serviceRates.pricePerCleaner}/hour per cleaner</div>
                  <div>Subscription = 4 Cleans / 20% discount</div>
                </div>
                {hourlyService.cleaners && hourlyService.hours && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    Calculated Amount: BHD {calculateHourlyAmount(
                      hourlyService.cleaners,
                      hourlyService.hours,
                      hourlyService.isSubscription,
                      serviceRates
                    ).toFixed(3)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BHD)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.001"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentType">Payment Type</Label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="BenefitPay">BenefitPay</option>
            </select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || !!recoveryMessage}>Cancel</Button>
            <Button type="submit" disabled={loading || !!recoveryMessage}>
              {(loading || !!recoveryMessage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(loading || !!recoveryMessage) ? 'Processing...' : 'Create Purchase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePurchaseModal;
