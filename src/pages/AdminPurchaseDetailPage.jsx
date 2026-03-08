
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format as formatTz, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { ArrowLeft, Save, UserCircle, ShoppingBag, CalendarDays, DollarSign, MapPin, List, Edit2, Briefcase, Phone, Clock, MessageSquare, Tag, FileText, Calculator, ExternalLink, Flag, AlertTriangle } from 'lucide-react';
import InvoiceModal from '@/components/AdminDashboard/InvoiceModal';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import CustomerSelector from '@/components/AdminDashboard/CustomerSelector';
import { useCustomerAutoFill } from '@/hooks/useCustomerAutoFill';
import { updatePurchase } from '@/lib/storage/purchaseStorage';
import { formatPreferredBookingDateForAdmin, toLocalDatetimeInputString } from '@/lib/dateTimeHelpers';

// --- Helper Functions ---

const formatDateSafe = (dateString, includeTime = true, placeholder = '—') => {
  try {
    if (!dateString) return placeholder;
    const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, 'Z');
    const date = new Date(cleanDateString);
    if (isNaN(date.getTime())) {
      return placeholder;
    }
    const zonedDate = utcToZonedTime(date, 'Asia/Bahrain');
    const displayFormat = includeTime ? 'yyyy-MM-dd hh:mm a' : 'yyyy-MM-dd';
    const formatted = formatTz(zonedDate, displayFormat, { timeZone: 'Asia/Bahrain' });
    
    return formatted;
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return placeholder;
  }
};

const formatForInput = (isoString) => {
    return toLocalDatetimeInputString(isoString);
};

const getStatusBadgeVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'confirmed':
    case 'paid':
      return 'success';
    case 'pending confirmation':
    case 'pending':
    case 'processing':
      return 'default';
    case 'cancelled':
    case 'failed':
    case 'refunded':
      return 'destructive';
    case 'flagged':
      return 'warning';
    default: return 'secondary';
  }
};

const calculateTransactionTotals = (baseAmountStr, discountType, discountValueStr) => {
    const base = parseFloat(baseAmountStr) || 0;
    let discount = 0;
    const discVal = parseFloat(discountValueStr) || 0;

    if (discountType === 'percent') {
        discount = base * (discVal / 100);
    } else if (discountType === 'fixed') {
        discount = discVal;
    }

    const total = Math.max(0, base - discount);
    
    return {
        baseAmount: base,
        discountAmount: discount,
        finalTotal: total
    };
};

const availableStatuses = ["Pending Confirmation", "Pending", "Confirmed", "Paid", "Processing", "Completed", "Cancelled", "Refunded", "Failed", "Flagged"];

// --- Components ---

const Section = ({ title, icon, children }) => (
    <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <h3 className="text-md font-semibold mb-3 flex items-center text-gray-800 dark:text-gray-200">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-2 pl-2">{children}</div>
    </div>
);

const DetailItem = ({ label, value, icon, valueClassName }) => (
    <div className="flex items-start text-sm py-1">
        <dt className="font-medium text-gray-500 dark:text-gray-400 w-36 shrink-0">{label}:</dt>
        <dd className={`text-gray-700 dark:text-gray-300 flex items-center ${valueClassName || ''}`}>
            {icon && <span className="mr-1.5 mt-0.5">{icon}</span>}
            {value}
        </dd>
    </div>
);

const PurchaseCustomerInfo = ({ purchase, customerName, isEditing, editableFields, onInputChange, onCustomerSelect, loadingAutoFill }) => (
  <Section title="Customer Contact Information" icon={<UserCircle className="h-5 w-5 text-primary"/>}>
    
    {isEditing && (
        <div className="mb-4 bg-slate-50 p-3 rounded border">
            <Label className="mb-1 block">Linked Customer Profile</Label>
            <CustomerSelector 
                selectedCustomerId={editableFields.customer_id} 
                onCustomerSelect={onCustomerSelect} 
            />
            {loadingAutoFill && <p className="text-xs text-muted-foreground mt-1 animate-pulse">Auto-filling details...</p>}
            <p className="text-[10px] text-muted-foreground mt-1">
                Selecting a customer will auto-fill name, email, phone, and primary address.
            </p>
        </div>
    )}

    {isEditing ? (
        <div className="space-y-3">
             <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-500 w-36 shrink-0">Contact Name</Label>
                <Input id="name" name="name" value={editableFields.name} onChange={onInputChange} className="mt-1 h-8 text-sm"/>
             </div>
             <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-500 w-36 shrink-0">Email</Label>
                <Input id="email" name="email" value={editableFields.email} onChange={onInputChange} className="mt-1 h-8 text-sm"/>
             </div>
             <div>
                <Label htmlFor="user_phone" className="text-sm font-medium text-gray-500 w-36 shrink-0">User Mobile</Label>
                <Input id="user_phone" name="user_phone" value={editableFields.user_phone} onChange={onInputChange} className="mt-1 h-8 text-sm"/>
             </div>
        </div>
    ) : (
        <>
            <DetailItem label="Contact Name" value={customerName || 'Guest'} />
            <DetailItem label="Email" value={purchase.email || 'N/A'} />
            <DetailItem 
                label="User Mobile" 
                value={purchase.user_phone || 'N/A'} 
                icon={<Phone className="h-4 w-4 text-muted-foreground"/>} 
            />
        </>
    )}
    
    {purchase.user_id && <DetailItem label="User ID" value={purchase.user_id} />}
  </Section>
);

const PurchaseServicePaymentInfo = ({ purchase, isEditing, editableFields, onInputChange, onSelectChange }) => {
    const { baseAmount, discountAmount, finalTotal } = calculateTransactionTotals(
        isEditing ? editableFields.base_amount : 0, 
        isEditing ? editableFields.discount_type : 'none', 
        isEditing ? editableFields.discount_value : 0
    );

    const displayAmount = purchase.final_amount_due_on_arrival !== null 
        ? purchase.final_amount_due_on_arrival 
        : purchase.paid_amount;

    return (
  <Section title="Service & Payment" icon={<ShoppingBag className="h-5 w-5 text-primary"/>}>
    {isEditing ? (
        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="product_name" className="text-sm font-medium">Product Name</Label>
                    <Input id="product_name" name="product_name" value={editableFields.product_name} onChange={onInputChange} className="mt-1 text-sm"/>
                </div>
                <div>
                    <Label htmlFor="preferred_booking_date" className="text-sm font-medium flex items-center">
                        Preferred Booking Date
                    </Label>
                    <Input 
                        id="preferred_booking_date" 
                        name="preferred_booking_date" 
                        type="datetime-local" 
                        value={editableFields.preferred_booking_date} 
                        onChange={onInputChange} 
                        className="mt-1 text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="base_amount" className="text-sm font-medium flex items-center">
                        Base Price (BHD) <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input 
                        id="base_amount" 
                        name="base_amount" 
                        type="number" 
                        step="0.001" 
                        min="0"
                        value={editableFields.base_amount} 
                        onChange={onInputChange} 
                        className="mt-1 text-sm font-semibold"
                    />
                </div>

                <div>
                    <Label htmlFor="discount_type" className="text-sm font-medium">Discount Type</Label>
                    <Select 
                        value={editableFields.discount_type} 
                        onValueChange={(val) => onSelectChange('discount_type', val)}
                    >
                        <SelectTrigger id="discount_type" className="mt-1 text-sm">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (BHD)</SelectItem>
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {editableFields.discount_type !== 'none' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="discount_value" className="text-sm font-medium">
                                {editableFields.discount_type === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (BHD)'}
                            </Label>
                            <Input 
                                id="discount_value" 
                                name="discount_value" 
                                type="number" 
                                step={editableFields.discount_type === 'percent' ? "1" : "0.001"}
                                min="0"
                                value={editableFields.discount_value} 
                                onChange={onInputChange} 
                                className="mt-1 text-sm"
                            />
                        </div>
                        <div>
                            <Label htmlFor="coupon_code" className="text-sm font-medium">Coupon Code (Optional)</Label>
                            <Input 
                                id="coupon_code" 
                                name="coupon_code" 
                                value={editableFields.coupon_code} 
                                onChange={onInputChange} 
                                className="mt-1 text-sm uppercase"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 dark:border-slate-600">
                <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">BHD {baseAmount.toFixed(3)}</span>
                </div>
                {editableFields.discount_type !== 'none' && (
                     <div className="flex justify-between items-center text-sm py-1 text-green-600 dark:text-green-400">
                        <span className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" /> Discount:
                        </span>
                        <span className="font-medium">- BHD {discountAmount.toFixed(3)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm py-1 mt-2 font-bold text-lg">
                    <span>Total Due:</span>
                    <span className="text-primary">BHD {finalTotal.toFixed(3)}</span>
                </div>
            </div>
        </div>
    ) : (
        <>
            <DetailItem label="Product Name" value={purchase.product_name || 'N/A'} />
            <DetailItem 
                label="Preferred Booking Date" 
                value={formatPreferredBookingDateForAdmin(purchase.preferred_booking_date)} 
                icon={<CalendarDays className="h-4 w-4 text-primary" />} 
                valueClassName="font-medium text-primary"
            />
            <DetailItem label="Payment Type" value={purchase.payment_type || 'N/A'} />
            
            <div className="mt-4 pt-3 border-t border-dashed">
                {Number(purchase.discount_amount) > 0 ? (
                    <DetailItem 
                        label="Base Amount" 
                        value={`BHD ${(Number(purchase.paid_amount) + Number(purchase.discount_amount)).toFixed(3)}`} 
                    />
                ) : (
                     <DetailItem 
                        label="Base Amount" 
                        value={`BHD ${Number(purchase.paid_amount).toFixed(3)}`} 
                    />
                )}
                
                {Number(purchase.discount_amount) > 0 && (
                    <div className="flex items-start text-sm py-1 text-green-700 dark:text-green-400">
                        <dt className="font-medium w-36 shrink-0 flex items-center">
                            Discount: 
                            {purchase.coupon_code && (
                                <Badge variant="outline" className="ml-2 h-5 px-1 text-[10px] border-green-300 bg-green-50 text-green-700">
                                    {purchase.coupon_code}
                                </Badge>
                            )}
                        </dt>
                        <dd className="font-medium">
                            - BHD {Number(purchase.discount_amount).toFixed(3)}
                        </dd>
                    </div>
                )}
                
                <div className="flex items-start text-sm py-1 mt-1 font-bold">
                    <dt className="w-36 shrink-0">Total Due:</dt>
                    <dd className="text-primary dark:text-sky-400 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1"/>
                        BHD {Number(displayAmount).toFixed(3)}
                    </dd>
                </div>
            </div>
        </>
    )}
  </Section>
)};

const PurchaseServicePaymentInfoWithJobs = ({ purchase, isEditing, editableFields, onInputChange, onSelectChange }) => {
  return (
    <>
      <PurchaseServicePaymentInfo 
        purchase={purchase} 
        isEditing={isEditing} 
        editableFields={editableFields} 
        onInputChange={onInputChange} 
        onSelectChange={onSelectChange}
      />
      {!isEditing && <PurchaseLinkedJobs purchase={purchase} />}
    </>
  );
};

const PurchaseLinkedJobs = ({ purchase }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!purchase.purchase_ref_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            user:profiles(first_name, last_name, email)
          `)
          .eq('purchase_ref_id', purchase.purchase_ref_id)
          .order('preferred_date', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching linked jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [purchase.purchase_ref_id]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Section title="Linked Jobs" icon={<Briefcase className="h-5 w-5 text-primary"/>}>
        <div className="text-sm text-gray-500">Loading jobs...</div>
      </Section>
    );
  }

  if (jobs.length === 0) {
    return (
      <Section title="Linked Jobs" icon={<Briefcase className="h-5 w-5 text-primary"/>}>
        <div className="text-sm text-gray-500">No jobs linked to this purchase.</div>
      </Section>
    );
  }

  return (
    <Section title="Linked Jobs" icon={<Briefcase className="h-5 w-5 text-primary"/>}>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.job_ref_id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Link 
                  to={`/admin-dashboard/job/${job.job_ref_id}`}
                  className="text-primary hover:underline font-mono text-sm font-medium"
                >
                  {job.job_ref_id}
                </Link>
                <Badge variant="secondary" className={getStatusColor(job.status)}>
                  {job.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-6 px-2 text-xs"
              >
                <Link to={`/admin-dashboard/job/${job.job_ref_id}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDateSafe(job.preferred_date, false)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(new Date(job.preferred_date).getTime() - 3 * 60 * 60 * 1000).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}
              </div>
              {job.user && (
                <div className="flex items-center gap-1">
                  <UserCircle className="h-3 w-3" />
                  {`${job.user.first_name || ''} ${job.user.last_name || ''}`.trim() || job.user.email}
                </div>
              )}
              {job.user_address?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.user_address.city}
                </div>
              )}
            </div>
            
            {job.notes && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {job.notes}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
};

const PurchaseAddressInfo = ({ purchase }) => {
  const address = purchase.address;
  if (!address) return (
    <Section title="Service Address Details" icon={<MapPin className="h-5 w-5 text-primary"/>}>
      <p className="text-sm text-gray-700 dark:text-gray-300">N/A</p>
    </Section>
  );

  const addressString = `${address.street || ''}, ${address.city || ''}, ${address.zip || ''}`
    .replace(/, , /g, ', ')
    .trim() || 'N/A';

  return (
    <Section title="Service Address Details" icon={<MapPin className="h-5 w-5 text-primary"/>}>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-slate-50 p-2 rounded border">{addressString}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {address.phone && (
            <DetailItem 
            label="Location Phone" 
            value={address.phone} 
            icon={<Phone className="h-4 w-4 text-blue-500"/>} 
            />
        )}
        {address.alt_phone && (
            <DetailItem 
            label="Alt. Location Phone" 
            value={address.alt_phone} 
            icon={<Phone className="h-4 w-4 text-blue-500"/>} 
            />
        )}
      </div>
    </Section>
  );
};


const AdminPurchaseDetailPage = () => {
  const { purchaseRefId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingFlagReason, setIsEditingFlagReason] = useState(false);
  const [flagReasonInput, setFlagReasonInput] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [editableFields, setEditableFields] = useState({
    status: '',
    product_name: '',
    preferred_booking_date: '',
    base_amount: '',    
    discount_type: 'none', 
    discount_value: '',
    coupon_code: '',
    user_phone: '',
    notes: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_phone: '',
    address_alt_phone: '',
    name: '',
    email: '',
    customer_id: null
  });

  // Use Auto-fill Hook
  const { loadingAutoFill } = useCustomerAutoFill(editableFields.customer_id, setEditableFields);

  const fetchPurchaseDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, profiles!purchases_user_id_fkey (first_name, last_name, phone)`)
        .eq('purchase_ref_id', purchaseRefId)
        .single();

      if (error) {
          console.error("Supabase select error in AdminPurchaseDetailPage:", error);
          throw error;
      }
      if (data) {
        setPurchase(data);
        
        const currentPaid = Number(data.paid_amount) || 0;
        const currentDiscount = Number(data.discount_amount) || 0;
        const restoredBase = currentPaid + currentDiscount;

        setEditableFields({
            status: data.status || '',
            product_name: data.product_name || '',
            preferred_booking_date: formatForInput(data.preferred_booking_date) || '',
            base_amount: data.final_amount_due_on_arrival?.toString() || data.paid_amount?.toString() || '',
            discount_type: 'none',
            discount_value: '',
            coupon_code: data.coupon_code || '',
            
            user_phone: data.user_phone || '',
            email: data.email || '',
            name: data.name || '',
            customer_id: data.user_id, // Default to existing user_id
            
            notes: data.notes || '',
            address_street: data.address?.street || '',
            address_city: data.address?.city || '',
            address_zip: data.address?.zip || '',
            address_phone: data.address?.phone || '',
            address_alt_phone: data.address?.alt_phone || ''
        });
        
        // Initialize flag reason input
        setFlagReasonInput(data.notes || '');
      } else {
        navigate("/admin-dashboard/purchases");
      }
    } catch (error) {
      console.error("Error fetching purchase details:", error);
      toast({ title: "Error", description: "Could not fetch purchase details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [purchaseRefId, toast, navigate]);

  useEffect(() => {
    fetchPurchaseDetails();
  }, [fetchPurchaseDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditableFields(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setEditableFields(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSaveFlagReason = async () => {
    try {
      await updatePurchase(purchaseRefId, { notes: flagReasonInput.trim() });
      toast({ title: "Success", description: "Flag reason updated successfully." });
      setIsEditingFlagReason(false);
      fetchPurchaseDetails();
    } catch (error) {
      console.error("Error updating flag reason:", error);
      toast({ title: "Error", description: "Failed to update flag reason.", variant: "destructive" });
    }
  };
  
  const handleCustomerSelect = (customerId) => {
      setEditableFields(prev => ({ ...prev, customer_id: customerId }));
  };
  
  const handleFlagPurchase = async () => {
    setLoading(true);
    try {
      const newStatus = purchase.status === 'Flagged' ? 'Pending' : 'Flagged';
      const actionText = newStatus === 'Flagged' ? 'Flagged' : 'Unflagged';
      
      await updatePurchase(purchaseRefId, { status: newStatus });
      toast({ title: `Purchase ${actionText}`, description: `Purchase status changed to ${newStatus}.` });
      fetchPurchaseDetails();
    } catch (error) {
      console.error("Error flagging purchase:", error);
      toast({ title: "Error", description: "Failed to update purchase status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      console.log("Starting purchase update with editableFields:", editableFields);
      
      // Validation: Flagged status requires a reason
      if (editableFields.status === 'Flagged' && !editableFields.notes?.trim()) {
        toast({ 
          title: "Validation Error", 
          description: "Please provide a reason when flagging a purchase.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
      
      const { discountAmount, finalTotal } = calculateTransactionTotals(
          editableFields.base_amount, 
          editableFields.discount_type, 
          editableFields.discount_value
      );

      let isoPreferredDate = null;
      if (editableFields.preferred_booking_date) {
        try {
            const utcDate = zonedTimeToUtc(editableFields.preferred_booking_date, 'Asia/Bahrain');
            isoPreferredDate = utcDate.toISOString();
        } catch {
            console.warn("Invalid date format entered");
        }
      }

      const updateData = {
        status: editableFields.status,
        product_name: editableFields.product_name,
        preferred_booking_date: isoPreferredDate,
        scheduled_at: isoPreferredDate, // Keep synced if updating preferred
        paid_amount: finalTotal,
        final_amount_due_on_arrival: finalTotal,
        discount_amount: discountAmount,
        coupon_code: editableFields.coupon_code ? editableFields.coupon_code.trim() : null,
        
        user_phone: editableFields.user_phone,
        email: editableFields.email,
        name: editableFields.name,
        // user_id is the canonical reference now
        user_id: editableFields.customer_id || purchase.user_id, 
        
        notes: editableFields.notes,
        address: {
            street: editableFields.address_street,
            city: editableFields.address_city,
            zip: editableFields.address_zip,
            phone: editableFields.address_phone,
            alt_phone: editableFields.address_alt_phone
        }
      };
      
      console.log("Prepared updateData for purchase:", updateData);
      console.log("PurchaseRefId:", purchaseRefId);
      
      await updatePurchase(purchaseRefId, updateData);

      toast({ title: "Success", description: "Purchase updated successfully." });
      setIsEditing(false);
      fetchPurchaseDetails(); 
    } catch (error) {
      console.error("Error updating purchase:", error);
      console.error("Full error details:", {
        message: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint
      });
      toast({ 
        title: "Error", 
        description: `Update failed: ${error.message || 'Unknown error'}`, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateJobFromPurchase = () => {
    if (purchase) {
      const jobCreationData = { ...purchase };
      if (!jobCreationData.user_phone && purchase.address?.phone) {
        jobCreationData.user_phone = purchase.address.phone;
      }
      navigate('/admin-dashboard/job/create', { state: { purchaseData: jobCreationData } });
    }
  };

  if (loading && !purchase) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!purchase) return null;

  const customerName = purchase.profiles ? `${purchase.profiles.first_name || ''} ${purchase.profiles.last_name || ''}`.trim() : purchase.name;
  const canCreateInvoice = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button asChild variant="outline" size="sm" className="admin-button-wrap">
          <Link to="/admin-dashboard/purchases"><ArrowLeft className="mr-2 h-4 w-4 button-icon" /> Back</Link>
        </Button>
        {!isEditing && canCreateInvoice && (
            <Button onClick={() => setIsInvoiceModalOpen(true)} size="sm" variant="outline" className="admin-button-wrap">
                <FileText className="mr-2 h-4 w-4 button-icon" /> Invoice
            </Button>
        )}
        {!isEditing && (
            <Button onClick={handleCreateJobFromPurchase} size="sm" variant="outline" className="admin-button-wrap">
                <Briefcase className="mr-2 h-4 w-4 button-icon" /> Create Job
            </Button>
        )}
        {!isEditing && (
            <Button onClick={() => setIsEditing(true)} size="sm" className="admin-button-wrap">
                <Edit2 className="mr-2 h-4 w-4 button-icon" /> Edit
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center text-2xl">
                    <ShoppingBag className="mr-3 h-7 w-7 text-primary"/>
                    Purchase: {purchase.purchase_ref_id}
                </CardTitle>
                <CardDescription>Created on: {formatDateSafe(purchase.created_at)}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(isEditing ? editableFields.status : purchase.status)} className="text-sm px-3 py-1 capitalize flex items-center gap-1">
                    {isEditing ? editableFields.status : purchase.status}
                    {!isEditing && purchase.status === 'Flagged' && (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                  </Badge>
                  {!isEditing && (
                    <Button 
                      onClick={handleFlagPurchase}
                      size="sm" 
                      variant="outline"
                      className="text-xs px-2 py-1 bg-white border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                      disabled={loading}
                    >
                      <Flag className="w-3 h-3 mr-1" />
                      {purchase.status === 'Flagged' ? 'Unflag' : 'Flag'}
                    </Button>
                  )}
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchase.status === 'Flagged' && !isEditing && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Flagged Purchase</h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs px-2 py-1 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      onClick={() => setIsEditingFlagReason(true)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit Reason
                    </Button>
                  </div>
                  {isEditingFlagReason ? (
                    <div className="space-y-2">
                      <Textarea 
                        value={flagReasonInput}
                        onChange={(e) => setFlagReasonInput(e.target.value)}
                        placeholder="Enter the reason for flagging this purchase..."
                        className="bg-white dark:bg-slate-800 border-yellow-300 dark:border-yellow-700 text-sm resize-none h-20"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveFlagReason}
                          className="bg-yellow-500 text-white hover:bg-yellow-600"
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setIsEditingFlagReason(false);
                            setFlagReasonInput(purchase.notes || '');
                          }}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {purchase.notes ? (
                        <div className="bg-white dark:bg-slate-800 rounded p-3 border border-yellow-300 dark:border-yellow-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{purchase.notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 italic">No reason provided for flagging this purchase.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {isEditing ? (
            <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Edit2 className="w-5 h-5 mr-2 text-primary" /> Edit Details
                </h3>
                
                <PurchaseCustomerInfo 
                    purchase={purchase} 
                    customerName={customerName} 
                    isEditing={isEditing} 
                    editableFields={editableFields} 
                    onInputChange={handleInputChange} 
                    onCustomerSelect={handleCustomerSelect}
                    loadingAutoFill={loadingAutoFill}
                />
                
                {/* Editable Address Section */}
                <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-md font-semibold mb-3 flex items-center text-gray-800 dark:text-gray-200">
                        <MapPin className="h-5 w-5 mr-2 text-primary"/> Service Address Details
                    </h3>
                    <div className="space-y-3 pl-2">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label htmlFor="address_street" className="text-sm">Street Address</Label>
                                <Input id="address_street" name="address_street" value={editableFields.address_street} onChange={handleInputChange} className="mt-1 h-8 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="address_city" className="text-sm">City</Label>
                                <Input id="address_city" name="address_city" value={editableFields.address_city} onChange={handleInputChange} className="mt-1 h-8 text-sm" />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="address_zip" className="text-sm">Zip/Block</Label>
                                <Input id="address_zip" name="address_zip" value={editableFields.address_zip} onChange={handleInputChange} className="mt-1 h-8 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                             <div>
                                <Label htmlFor="address_phone" className="text-sm">Location Phone</Label>
                                <Input id="address_phone" name="address_phone" value={editableFields.address_phone} onChange={handleInputChange} className="mt-1 h-8 text-sm" />
                            </div>
                             <div>
                                <Label htmlFor="address_alt_phone" className="text-sm">Alt. Phone</Label>
                                <Input id="address_alt_phone" name="address_alt_phone" value={editableFields.address_alt_phone} onChange={handleInputChange} className="mt-1 h-8 text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                <PurchaseServicePaymentInfoWithJobs 
                    purchase={purchase} 
                    isEditing={isEditing} 
                    editableFields={editableFields} 
                    onInputChange={handleInputChange} 
                    onSelectChange={handleSelectChange}
                />

                <div className="md:col-span-2">
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-500 w-36 shrink-0">
                        {editableFields.status === 'Flagged' ? 'Flag Reason (Required)' : 'Internal Notes'}
                    </Label>
                    <Textarea 
                        id="notes" 
                        name="notes" 
                        value={editableFields.notes} 
                        onChange={handleInputChange} 
                        placeholder={editableFields.status === 'Flagged' 
                            ? 'Please explain why this purchase is flagged...' 
                            : 'Add any internal notes about this purchase...'}
                        className="mt-1 text-sm resize-none h-20"
                        rows={3}
                    />
                    {editableFields.status === 'Flagged' && !editableFields.notes && (
                        <p className="text-xs text-yellow-600 mt-1">Flag reason is required when status is Flagged.</p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <Label htmlFor="status" className="text-sm font-medium text-gray-500 w-36 shrink-0">Status</Label>
                    <Select value={editableFields.status} onValueChange={(val) => handleSelectChange('status', val)}>
                        <SelectTrigger id="status" className="mt-1 text-sm">
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                 <div className="flex justify-end flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="outline" onClick={() => {
                        setIsEditing(false);
                        fetchPurchaseDetails();
                    }} className="admin-button-wrap">Cancel</Button>
                    <Button onClick={handleSaveChanges} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 admin-button-wrap">
                        {loading ? 'Saving...' : <><Save className="mr-2 h-4 w-4 button-icon"/> Save</>}
                    </Button>
                 </div>
            </div>
          ) : (
            <>
                <PurchaseCustomerInfo purchase={purchase} customerName={customerName} isEditing={false} />
                <PurchaseAddressInfo purchase={purchase} />
                <PurchaseServicePaymentInfoWithJobs purchase={purchase} />
            </>
          )}
        </CardContent>
      </Card>
      
      <InvoiceModal 
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        purchase={purchase}
      />
    </div>
  );
};

export default AdminPurchaseDetailPage;
