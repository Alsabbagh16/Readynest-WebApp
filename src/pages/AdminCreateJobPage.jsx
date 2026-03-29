
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, User, Briefcase, Users, Hash, MapPin, CalendarClock, Phone, AlertCircle, ShoppingBag, PackagePlus } from 'lucide-react';
import { generateJobRefId } from '@/lib/storage/jobStorage';
import { validateBookingTime } from '@/lib/timeWindowValidator';
import { toLocalDatetimeInputString } from '@/lib/dateTimeHelpers';
import { sendJobCreatedNotification } from '@/lib/whatsappService';

// Helper to convert DB timestamp to local input string by stripping timezone info
// treating the stored time as "Face Value" / Wall Clock time
const toLocalInputString = (dateString) => {
    if (!dateString) return '';
    // Strip everything after the seconds to ensure we get just YYYY-MM-DDTHH:mm
    // This removes Z, +00:00, or any offset info
    return dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '').substring(0, 16);
};

// Helper to get current local time string for min attribute
const getCurrentLocalString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const JobCoreDetailsFormSection = ({ formData, handleInputChange, availableStatuses, dateError }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white"><Briefcase className="mr-2 h-5 w-5 text-primary" />Job Details</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="job_ref_id" className="dark:text-slate-300">Job Reference ID</Label>
        <Input id="job_ref_id" name="job_ref_id" value={formData.job_ref_id} readOnly disabled className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"/>
      </div>
      <div>
        <div className="space-y-2">
          <Label className="dark:text-slate-300 flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Preferred Date & Time <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input 
                id="preferred_date" 
                name="preferred_date" 
                type="date" 
                value={formData.preferred_date ? formData.preferred_date.split('T')[0] : ''} 
                onChange={(e) => {
                  const timePart = formData.preferred_date ? formData.preferred_date.split('T')[1] : '09:00';
                  const newDateTime = e.target.value ? `${e.target.value}T${timePart}` : '';
                  handleInputChange({ target: { name: 'preferred_date', value: newDateTime } });
                }}
                className={`dark:bg-slate-700 dark:border-slate-600 dark:text-white ${dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            <Input 
                type="time" 
                value={formData.preferred_date ? formData.preferred_date.split('T')[1] : ''} 
                onChange={(e) => {
                  const datePart = formData.preferred_date ? formData.preferred_date.split('T')[0] : new Date().toISOString().split('T')[0];
                  const newDateTime = e.target.value ? `${datePart}T${e.target.value}` : '';
                  handleInputChange({ target: { name: 'preferred_date', value: newDateTime } });
                }}
                className={`dark:bg-slate-700 dark:border-slate-600 dark:text-white ${dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
              Select any date and time (past dates allowed).
          </p>
        </div>
        {dateError && (
            <p className="text-sm text-red-500 flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" /> {dateError}
            </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
            Time is stored exactly as entered (Face Value).
        </p>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="status" className="dark:text-slate-300">Status <span className="text-red-500">*</span></Label>
        <Select name="status" value={formData.status} onValueChange={(value) => handleInputChange({ target: { name: 'status', value } })} required>
          <SelectTrigger id="status" className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {availableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
);

const CustomerInfoFormSection = ({ formData, handleInputChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white"><User className="mr-2 h-5 w-5 text-primary" />Customer Contact Info</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="user_name" className="dark:text-slate-300">Full Name <span className="text-red-500">*</span></Label>
        <Input id="user_name" name="user_name" value={formData.user_name} onChange={handleInputChange} placeholder="Customer's full name" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
      </div>
      <div>
        <Label htmlFor="user_email" className="dark:text-slate-300">Email <span className="text-red-500">*</span></Label>
        <Input id="user_email" name="user_email" type="email" value={formData.user_email} onChange={handleInputChange} placeholder="customer@example.com" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
      </div>
      <div>
        <Label htmlFor="user_phone" className="dark:text-slate-300">Personal Phone</Label>
        <Input id="user_phone" name="user_phone" type="tel" value={formData.user_phone} onChange={handleInputChange} placeholder="Customer's mobile number" className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
        <p className="text-[10px] text-muted-foreground mt-1">Primary contact for user account/updates.</p>
      </div>
    </CardContent>
  </Card>
);

const AddressFormSection = ({ formData, handleAddressChange }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center dark:text-white"><MapPin className="mr-2 h-5 w-5 text-primary" />Service Address Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="street" className="dark:text-slate-300">Street <span className="text-red-500">*</span></Label>
                <Input id="street" name="street" value={formData.user_address.street} onChange={handleAddressChange} placeholder="123 Main St" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            </div>
            <div>
                <Label htmlFor="city" className="dark:text-slate-300">City <span className="text-red-500">*</span></Label>
                <Input id="city" name="city" value={formData.user_address.city} onChange={handleAddressChange} placeholder="Anytown" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            </div>
            <div>
                <Label htmlFor="zip" className="dark:text-slate-300">Block / ZIP <span className="text-red-500">*</span></Label>
                <Input id="zip" name="zip" value={formData.user_address.zip} onChange={handleAddressChange} placeholder="90210" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            </div>
            
            <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 my-2"></div>

             <div>
                <Label htmlFor="address_phone" className="dark:text-slate-300 flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Location Phone <span className="text-red-500">*</span>
                </Label>
                <Input id="address_phone" name="phone" type="tel" value={formData.user_address.phone || ''} onChange={handleAddressChange} placeholder="Phone at this location" required className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                <p className="text-[10px] text-muted-foreground mt-1">Contact number specific to this service location.</p>
            </div>
             <div>
                <Label htmlFor="address_alt_phone" className="dark:text-slate-300">Alt. Location Phone</Label>
                <Input id="address_alt_phone" name="alt_phone" type="tel" value={formData.user_address.alt_phone || ''} onChange={handleAddressChange} placeholder="Alternative contact number" className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            </div>
        </CardContent>
    </Card>
);

const EmployeeAssignmentFormSection = ({ formData, handleEmployeeSelect, allEmployees }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white"><Users className="mr-2 h-5 w-5 text-primary" />Assign Employees</CardTitle>
    </CardHeader>
    <CardContent>
      {allEmployees.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md dark:border-slate-600">
          {allEmployees.map(emp => (
            <div key={emp.id} className="flex items-center space-x-2">
              <Checkbox
                id={`emp-${emp.id}`}
                checked={formData.assigned_employees_ids.includes(emp.id)}
                onCheckedChange={() => handleEmployeeSelect(emp.id)}
                className="dark:border-slate-500 dark:data-[state=checked]:bg-primary dark:data-[state=checked]:text-primary-foreground"
              />
              <Label htmlFor={`emp-${emp.id}`} className="text-sm font-normal dark:text-slate-300">
                {emp.full_name} <span className="text-xs text-muted-foreground dark:text-slate-400">({emp.position || 'Employee'})</span>
              </Label>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm dark:text-slate-400">No employees available for assignment. Add employees in the 'Employees' tab.</p>
      )}
    </CardContent>
  </Card>
);

const NotesFormSection = ({ formData, handleInputChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white"><Hash className="mr-2 h-5 w-5 text-primary" />Internal Notes</CardTitle>
    </CardHeader>
    <CardContent>
      <Textarea
        id="notes"
        name="notes"
        value={formData.notes}
        onChange={handleInputChange}
        placeholder="Add any internal notes for this job (e.g., special instructions, customer preferences)..."
        rows={4}
        className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />
    </CardContent>
  </Card>
);

const AddonsFormSection = ({ formData, handleAddonToggle, availableAddons, loadingAddons }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white">
        <PackagePlus className="mr-2 h-5 w-5 text-primary" />Add-ons
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loadingAddons ? (
        <p className="text-muted-foreground text-sm dark:text-slate-400">Loading add-ons...</p>
      ) : availableAddons.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md dark:border-slate-600">
          {availableAddons.map(addon => {
            const isSelected = formData.addons?.some(a => a.id === addon.id);
            return (
              <div key={addon.id} className="flex items-center justify-between space-x-2 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`addon-${addon.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleAddonToggle(addon)}
                    className="dark:border-slate-500 dark:data-[state=checked]:bg-primary dark:data-[state=checked]:text-primary-foreground"
                  />
                  <Label htmlFor={`addon-${addon.id}`} className="text-sm font-normal dark:text-slate-300 cursor-pointer">
                    {addon.name}
                    {addon.description && (
                      <span className="block text-xs text-muted-foreground dark:text-slate-400">{addon.description}</span>
                    )}
                  </Label>
                </div>
                <span className="text-sm font-medium text-primary dark:text-sky-400">
                  +BHD {parseFloat(addon.price || 0).toFixed(3)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm dark:text-slate-400">No add-ons available.</p>
      )}
      {formData.addons && formData.addons.length > 0 && (
        <div className="mt-3 pt-3 border-t dark:border-slate-600">
          <p className="text-sm font-medium dark:text-slate-300">
            Selected Add-ons Total: <span className="text-primary dark:text-sky-400">BHD {formData.addons.reduce((sum, a) => sum + parseFloat(a.price || 0), 0).toFixed(3)}</span>
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);

const PurchaseLinkFormSection = ({ formData, handlePurchaseSelect, availablePurchases, loadingPurchases }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center dark:text-white">
        <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
        Link to Existing Purchase (Optional)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Label htmlFor="purchase_select" className="dark:text-slate-300 mb-1 block">
        Select a purchase to auto-fill details...
      </Label>
      
      <Select 
        value={formData.purchase_ref_id || "none"} 
        onValueChange={(val) => handlePurchaseSelect(val === "none" ? null : val)}
        disabled={loadingPurchases}
      >
        <SelectTrigger id="purchase_select" className="dark:bg-slate-700 dark:border-slate-600 dark:text-white w-full">
            <SelectValue placeholder={loadingPurchases ? "Loading purchases..." : "Select a purchase..."} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <SelectItem value="none">None (Create standalone job)</SelectItem>
            {availablePurchases.map((p) => {
                const displayName = p.name || (p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : p.email);
                const displayAmount = p.paid_amount ? `BHD ${Number(p.paid_amount).toFixed(2)}` : '';
                return (
                    <SelectItem key={p.purchase_ref_id} value={p.purchase_ref_id}>
                        {`Purchase #${p.purchase_ref_id} - ${displayName} - ${displayAmount}`}
                    </SelectItem>
                );
            })}
        </SelectContent>
      </Select>

      {formData.purchase_ref_id && (
        <p className="text-xs text-muted-foreground mt-2 dark:text-slate-400">
          Selected purchase details have been pre-filled. You can edit them if needed.
        </p>
      )}
    </CardContent>
  </Card>
);


const AdminCreateJobPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const purchaseDataFromState = location.state?.purchaseData;

  const [formData, setFormData] = useState({
    job_ref_id: generateJobRefId(),
    document_urls: [],
    preferred_date: '',
    status: 'Scheduled',
    user_name: '',
    user_email: '',
    user_phone: '',
    user_address: {
      street: '',
      city: '',
      zip: '',
      phone: '',
      alt_phone: ''
    },
    assigned_employees_ids: [],
    addons: [],
    notes: '',
    purchase_ref_id: null,
  });

  // Debug formData changes
  useEffect(() => {
    console.log("formData changed:", formData);
  }, [formData]);

  const [allEmployees, setAllEmployees] = useState([]);
  const [availablePurchases, setAvailablePurchases] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState(null);

  const availableStatuses = ["Pending Assignment", "Scheduled", "Assigned", "In Progress", "On Hold", "Completed", "Cancelled", "Failed"];

  const fetchPurchasesAndEmployees = useCallback(async () => {
    try {
      setLoadingPurchases(true);
      setLoadingAddons(true);
      
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('purchase_ref_id, name, email, user_phone, address, product_name, preferred_booking_date, selected_addons, user_id, paid_amount, profiles(first_name, last_name, phone)')
        .order('created_at', { ascending: false })
        .limit(100); 
      
      if (purchasesError) throw purchasesError;
      setAvailablePurchases(purchasesData || []);

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, position');
      if (employeesError) throw employeesError;
      setAllEmployees(employeesData || []);

      // Fetch available addons
      const { data: addonsData, error: addonsError } = await supabase
        .from('addon_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (addonsError) throw addonsError;
      setAvailableAddons(addonsData || []);
    } catch (error) {
      console.error("Error fetching purchases or employees:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
    } finally {
      setLoadingPurchases(false);
      setLoadingAddons(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPurchasesAndEmployees();
  }, [fetchPurchasesAndEmployees]);

  const populateFormWithPurchaseData = useCallback((purchaseData) => {
    if (purchaseData) {
      console.log("Populating form with purchase data:", purchaseData);
      setFormData(prev => {
        const newFormData = {
            ...prev,
            purchase_ref_id: purchaseData.purchase_ref_id || null,
            user_id: purchaseData.user_id || null,
            user_name: purchaseData.name || (purchaseData.profiles ? `${purchaseData.profiles.first_name || ''} ${purchaseData.profiles.last_name || ''}`.trim() : ''),
            user_email: purchaseData.email || '',
            user_phone: purchaseData.user_phone || (purchaseData.profiles?.phone) || '', 
            user_address: {
                street: purchaseData.address?.street || '',
                city: purchaseData.address?.city || '',
                zip: purchaseData.address?.zip || purchaseData.address?.zip_code || '',
                phone: purchaseData.address?.phone || '',
                alt_phone: purchaseData.address?.alt_phone || '',
            },
            addons: purchaseData.selected_addons || [],
            // Use the shared timezone helper to format the preferred_booking_date correctly
            preferred_date: purchaseData.preferred_booking_date ? toLocalDatetimeInputString(purchaseData.preferred_booking_date) : '',
            notes: `Job created from purchase ${purchaseData.purchase_ref_id}. Product: ${purchaseData.product_name || 'N/A'}.`.trim(),
        };
        console.log("New form data after population:", newFormData);
        // Trigger validation if date exists
        if (newFormData.preferred_date) {
            const val = validateBookingTime(newFormData.preferred_date);
            setDateError(val.isValid ? null : val.error);
        }
        return newFormData;
      });
    }
  }, []);

  useEffect(() => {
    console.log("purchaseDataFromState:", purchaseDataFromState);
    if (purchaseDataFromState && !loadingPurchases) {
      populateFormWithPurchaseData(purchaseDataFromState);
    }
  }, [purchaseDataFromState, loadingPurchases, populateFormWithPurchaseData]);

  // Separate effect to handle when purchases finish loading
  useEffect(() => {
    if (!loadingPurchases && purchaseDataFromState && availablePurchases.length > 0) {
      console.log("Purchases loaded, populating form with purchase data");
      populateFormWithPurchaseData(purchaseDataFromState);
    }
  }, [loadingPurchases, availablePurchases.length, purchaseDataFromState, populateFormWithPurchaseData]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'preferred_date') {
        const val = validateBookingTime(value);
        setDateError(val.isValid ? null : val.error);
    }
  };
  
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      user_address: {
        ...prev.user_address,
        [name]: value
      }
    }));
  };

  const handleEmployeeSelect = (employeeId) => {
    setFormData(prev => {
      const newAssignedIds = prev.assigned_employees_ids.includes(employeeId)
        ? prev.assigned_employees_ids.filter(id => id !== employeeId)
        : [...prev.assigned_employees_ids, employeeId];
      return { ...prev, assigned_employees_ids: newAssignedIds };
    });
  };

  const handleAddonToggle = (addon) => {
    setFormData(prev => {
      const currentAddons = prev.addons || [];
      const isSelected = currentAddons.some(a => a.id === addon.id);
      
      const newAddons = isSelected
        ? currentAddons.filter(a => a.id !== addon.id)
        : [...currentAddons, { id: addon.id, name: addon.name, price: addon.price }];
      
      return { ...prev, addons: newAddons };
    });
  };
  
  const handlePurchaseSelect = (purchaseRefId) => {
    if (!purchaseRefId || purchaseRefId === "none") {
        // Reset if no purchase selected (or "None" selected)
        setFormData(prev => ({
            ...prev,
            purchase_ref_id: null,
            user_id: null,
            user_name: '',
            user_email: '',
            user_phone: '',
            user_address: { street: '', city: '', zip: '', phone: '', alt_phone: '' },
            addons: [],
            // Remove auto-generated note part but keep user notes if any
            notes: prev.notes.replace(/Job created from purchase [A-Z0-9-]+\. Product: [^\.]+\./, '').trim(),
        }));
        return;
    }

    const selected = availablePurchases.find(p => p.purchase_ref_id === purchaseRefId);
    if (selected) {
        populateFormWithPurchaseData(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (dateError) {
         toast({ title: "Invalid Date", description: dateError, variant: "destructive" });
         return;
    }

    setIsSubmitting(true);

    if (!formData.preferred_date || !formData.user_name || !formData.user_email || !formData.user_address.street || !formData.user_address.city || !formData.user_address.zip || !formData.user_address.phone) {
        toast({ title: "Missing Required Fields", description: "Please fill in all required fields (*).", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
      // Ensure purchase_ref_id is treated as NULL if empty or undefined
      // This is crucial to avoid FK constraint errors with empty strings
      let finalPurchaseId = formData.purchase_ref_id;
      
      // Trim if string to remove accidental whitespace
      if (typeof finalPurchaseId === 'string') {
          finalPurchaseId = finalPurchaseId.trim();
      }

      // Explicitly set to NULL if empty string or "none"
      if (!finalPurchaseId || finalPurchaseId === "none") {
          finalPurchaseId = null;
      }

      console.log("[Job Submit] purchase_ref_id:", finalPurchaseId, "type:", typeof finalPurchaseId);

      // Format date for storage: Append 'Z' to stored input time.
      const formattedDateForStorage = formData.preferred_date ? `${formData.preferred_date}:00Z` : null;

      const jobPayload = {
        ...formData,
        purchase_ref_id: finalPurchaseId,
        preferred_date: formattedDateForStorage,
        document_urls: [], 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[Job Submit] payload:", jobPayload);

      const { error } = await supabase
        .from('jobs')
        .insert([jobPayload]);

      if (error) {
        console.error("[Job Submit] error:", error);
        throw error;
      }

      // --- Trigger Email Confirmation ---
      toast({ title: "Job Created", description: "Job saved. Sending confirmation email..." });
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-job-confirmation', {
            body: { record: jobPayload }
        });

        if (emailError) {
             console.error("Email send failed:", emailError);
             toast({ title: "Job Created", description: "Job saved, but email confirmation failed.", variant: "warning" });
        } else {
             toast({ title: "Email Sent", description: `Confirmation sent to ${formData.user_email}` });
        }
      } catch (emailException) {
          console.error("Email exception:", emailException);
          toast({ title: "Email Error", description: "Job saved, but email system encountered an error.", variant: "destructive" });
      }
      // ----------------------------------

      // --- Trigger WhatsApp Notification ---
      const fullAddress = `${formData.user_address.street}, ${formData.user_address.city}`;
      sendJobCreatedNotification({
        jobRefId: formData.job_ref_id,
        customerName: formData.user_name,
        customerPhone: formData.user_address.phone,
        scheduledDate: formData.preferred_date,
        address: fullAddress
      }).catch(err => console.error('WhatsApp job notification failed:', err));
      // ----------------------------------

      navigate('/admin-dashboard/jobs');
    } catch (error) {
      console.error("Error creating job:", error);
      toast({ title: "Error", description: `Could not create job. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-0 md:p-6 dark:text-slate-300">
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="outline" size="sm" className="dark:text-white dark:border-slate-600 hover:dark:bg-slate-700">
          <Link to="/admin-dashboard/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
        </Button>
        <h1 className="text-2xl font-bold dark:text-white">Create New Job</h1>
      </div>

    <form onSubmit={handleSubmit} className="space-y-6">
        <PurchaseLinkFormSection
            formData={formData}
            handlePurchaseSelect={handlePurchaseSelect}
            availablePurchases={availablePurchases}
            loadingPurchases={loadingPurchases}
        />
        <JobCoreDetailsFormSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
            availableStatuses={availableStatuses} 
            dateError={dateError}
        />
        <AddonsFormSection
            formData={formData}
            handleAddonToggle={handleAddonToggle}
            availableAddons={availableAddons}
            loadingAddons={loadingAddons}
        />
        <CustomerInfoFormSection 
            formData={formData} 
            handleInputChange={handleInputChange}
        />
        <AddressFormSection
            formData={formData}
            handleAddressChange={handleAddressChange}
        />
        <EmployeeAssignmentFormSection 
            formData={formData} 
            handleEmployeeSelect={handleEmployeeSelect} 
            allEmployees={allEmployees} 
        />
        <NotesFormSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
        />

        <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/admin-dashboard/jobs')} disabled={isSubmitting} className="dark:text-white dark:border-slate-600 hover:dark:bg-slate-700">
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !!dateError} className="dark:bg-primary dark:text-primary-foreground hover:dark:bg-primary/90">
            {isSubmitting ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Job...
                </>
            ) : (
                <><Save className="mr-2 h-4 w-4" /> Create Job</>
            )}
            </Button>
        </div>
        </form>
    </div>
  );
};

export default AdminCreateJobPage;
