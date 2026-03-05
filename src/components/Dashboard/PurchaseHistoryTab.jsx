import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShoppingBag, CalendarDays, Tag, CheckSquare, DollarSign, MessageSquare, AlertTriangle, LifeBuoy } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePermissionContext } from '@/contexts/PermissionContext';

const formatDateSafe = (dateString) => {
    try {
        if (!dateString) return 'N/A';
        const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
        const date = new Date(cleanDateString);
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, 'MMM d, yyyy, h:mm a');
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};

const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed':
        case 'confirmed':
             return 'success';
        case 'pending confirmation':
        case 'pending payment':
             return 'default';
        case 'processing':
             return 'outline';
        case 'shipped':
             return 'info';
        case 'cancelled':
        case 'failed':
             return 'destructive';
        default: return 'secondary';
    }
};

const PurchaseHistoryTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use permission context in case this component is used by Admin via impersonation or similar, 
  // or if staff accesses their own dashboard.
  // Although this component is typically for the 'User Dashboard' not 'Admin Dashboard',
  // task 8 mentions: "If user is admin/staff with hasPerm('purchases.view_all'), show all purchases; else show user's own purchases"
  // This implies we might be using this component in a context where admins see it.
  // Note: PermissionContext needs to be available. If not available (regular user), hooks might fail or return defaults.
  // We'll wrap usage safely or assume PermissionContext is provided at App level.
  // Since standard users might not have PermissionContext, we should check if context exists or handle gracefully.
  // However, the instructions imply extending RBAC here. I will assume PermissionContext is available or I can use a safe fallback.
  // Standard users won't have 'adminUser' in context, so 'usePermissions' returns defaults (false/empty).
  
  // Actually, 'usePermissionContext' throws if not in provider. 
  // I will try to use it, but if this is user dashboard, it might not be wrapped.
  // But since I cannot change App.jsx to wrap User Dashboard, I should probably only apply this logic IF the hook works.
  // But wait, Task 8 explicitly asks for it. 
  // If I can't wrap App.jsx, I'll import 'usePermissions' directly and use it locally if context isn't guaranteed.
  // BUT usePermissions depends on 'useAdminAuth'. Regular users don't have admin auth.
  // So 'adminUser' will be null. 'isSuperadmin' false. 'hasPerm' false.
  // So standard users fall into "else show user's own purchases". This is correct.
  
  // I'll use `usePermissions` hook directly here to avoid Context dependency issues if not wrapped.
  // But `usePermissions` uses `useAdminAuth`. If `AdminAuthProvider` isn't wrapping `DashboardPage`, it will fail.
  // `DashboardPage` is usually for customers. `AdminDashboardPage` is for admins.
  // If this component `PurchaseHistoryTab` is used in `DashboardPage`, we must check if `AdminAuthProvider` is present.
  // If not present, we can't check permissions.
  // I will assume for now that if I'm adding RBAC logic, the environment supports it, or I'll implement a safe check.
  
  // SAFE APPROACH: We can't easily check if context exists without try/catch or a wrapper.
  // However, `useAdminAuth` typically returns context.
  // If the user is a Staff member logging into the main "User Dashboard" (e.g. to test), they might expect to see all?
  // Or is this `PurchaseHistoryTab` used in Admin Panel? No, Admin uses `RecentPurchasesTab`.
  // Task 8 says "PurchaseHistoryTab (customer dashboard)".
  // So this is for the customer view.
  // If a staff member logs in as a customer, they are just a customer.
  // UNLESS the prompt implies that the "Admin" permissions carry over?
  // If I am logged in as Admin in one tab, and go to Customer Dashboard, they are separate auth contexts usually (one is 'adminUser', one is 'user').
  // `usePermissions` relies on `adminUser`.
  // If `adminUser` is null (which it is for regular customer login), then `isSuperadmin` is false.
  // So for a standard customer, it will always be "show own".
  // This satisfies the condition "else show user's own purchases".
  // The "If user is admin/staff..." part would only trigger if `adminUser` is populated.
  
  // I'll import the hook. If it fails, I'll default to own-only.
  
  // To use `usePermissions`, I need `useAdminAuth`.
  // I will try to assume the component might be used where `AdminAuthProvider` is active.
  
  const [permissionData, setPermissionData] = useState({ isSuperadmin: false, hasUiRoles: false, hasPerm: () => false });

  // Dynamically import logic to avoid crashing if contexts aren't present? No, standard imports.
  // I'll just skip the hook if I can't be sure, but I must implement Task 8.
  // Let's assume `usePermissions` handles the "no admin user" case gracefully (it does, returns defaults).
  // But `useAdminAuth` must not crash. `useAdminAuth` context usually throws if missing.
  // Codebase check: `src/contexts/AdminAuthContext.jsx`.
  // It throws "useAdminAuth must be used within a AdminAuthProvider".
  // `DashboardPage` (customer) is NOT wrapped in `AdminAuthProvider` in `App.jsx` (based on typical structure).
  // So using `usePermissions` here WILL CRASH the customer dashboard.
  
  // FIX: I cannot implement Task 8 safely without knowing `AdminAuthProvider` wraps `DashboardPage`.
  // However, I can't edit `App.jsx` freely to wrap everything.
  // Wait, I can edit `App.jsx`? "Update App.jsx... to wrap AdminDashboardPage...".
  // I didn't get instructions to wrap `DashboardPage` (customer).
  // So, I should probably NOT use `usePermissions` here unless I'm sure.
  
  // Alternative: Check `user` metadata? 
  // No, permissions are in `ui_permissions` via `employees` table.
  // User is in `auth.users`.
  
  // Maybe Task 8 implies that sometimes this component is used inside Admin Dashboard?
  // But Admin Dashboard has `RecentPurchasesTab`.
  
  // Let's look at `PurchaseHistoryTab` usage. It's in `DashboardPage.jsx`.
  // If I add `usePermissions` it crashes.
  
  // DECISION: I will implement the logic using `supabase` directly to check if the current user is an admin/employee with permissions,
  // INDEPENDENT of the AdminAuthContext. This acts as a standalone check for this component.
  
  const checkUserPermissions = async (uid) => {
      // 1. Check if user is in employees table
      const { data: emp, error } = await supabase.from('employees').select('role, is_superadmin').eq('id', uid).single();
      if (error || !emp) return { isSuper: false, canViewAll: false };
      
      const isSuper = emp.is_superadmin || emp.role === 'superadmin';
      if (isSuper) return { isSuper: true, canViewAll: true };

      // 2. Check permissions
      // We need to fetch roles -> permissions
      const { data: roles } = await supabase.from('ui_employee_roles')
        .select('ui_roles(ui_role_permissions(ui_permissions(key)))')
        .eq('employee_id', uid);
      
      let hasViewAll = false;
      roles?.forEach(r => {
          r.ui_roles?.ui_role_permissions?.forEach(rp => {
              if (rp.ui_permissions?.key === 'purchases.view_all') hasViewAll = true;
          });
      });
      
      return { isSuper: false, canViewAll: hasViewAll };
  };

  const fetchPurchases = useCallback(async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Check permissions manually since we might not be in AdminContext
      // This adds overhead but is safe.
      const { isSuper, canViewAll } = await checkUserPermissions(user.id);
      
      let query = supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      // Task 8 Logic:
      // If admin/staff with permission -> show all.
      // Else -> show own.
      
      if (!isSuper && !canViewAll) {
         query = query.eq('user_id', user.id);
      } else {
         // If they are admin/view_all, they see EVERYTHING?
         // Task 8 says: "show all purchases".
         // Okay.
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }
      setPurchases(data || []);
    } catch (e) {
      console.error("Error fetching purchase history:", e);
      setError(e.message || "Failed to fetch purchase history.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleContactSupport = (purchaseId, productName) => {
    navigate('/contact', {
      state: {
        prefilledMessage: `Hello, I need help regarding my purchase (Order Ref: ${purchaseId}) for ${productName}.`
      }
    });
  };

  const handleReportIssue = (purchaseId, productName) => {
    navigate('/contact', {
      state: {
        prefilledMessage: `I would like to report an issue with my purchase (Order Ref: ${purchaseId}) for ${productName}.`
      }
    });
  };

  if (loading) {
    return <div className="p-6 text-center">Loading your purchase history...</div>;
  }

  if (error) {
    return (
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>Review your past bookings and purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-10 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-700 dark:text-red-300 font-semibold">Oops! Something went wrong.</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
     <Card className="border-0 shadow-none rounded-none">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-bold">
            <ShoppingBag className="mr-3 h-7 w-7 text-primary" />
            Purchase History
        </CardTitle>
        <CardDescription>Review your past bookings and purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
            <div className="text-center py-10">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">You have no past purchases.</p>
                <p className="text-sm text-muted-foreground">Ready to book your next cleaning service?</p>
            </div>
        ) : (
            <Accordion type="single" collapsible className="w-full space-y-3">
              {purchases.map((purchase) => {
                const displayAmount = purchase.final_amount_due_on_arrival !== null 
                    ? purchase.final_amount_due_on_arrival 
                    : purchase.paid_amount;
                
                return (
                <AccordionItem value={purchase.purchase_ref_id} key={purchase.purchase_ref_id} className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left">
                        <div className="flex-1 mb-2 md:mb-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-primary text-sm md:text-base dark:text-sky-400">{purchase.product_name || 'Custom Service'}</p>
                                {purchase.coupon_code && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-200 text-green-700 bg-green-50">
                                        <Tag className="w-3 h-3 mr-1"/> {purchase.coupon_code}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Ref: {purchase.purchase_ref_id}</p>
                        </div>
                        <div className="flex items-center space-x-4 md:space-x-6 text-xs md:text-sm">
                            <span className="text-muted-foreground whitespace-nowrap">{formatDateSafe(purchase.created_at)}</span>
                            <Badge variant={getStatusBadgeVariant(purchase.status)} className="capitalize text-xs px-2 py-0.5">{purchase.status || 'Unknown'}</Badge>
                            <span className="font-semibold text-foreground dark:text-white">${Number(displayAmount).toFixed(2)}</span>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 border-t border-border dark:border-slate-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><Tag className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Service Details</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Product:</strong> {purchase.product_name || 'N/A'}</p>
                            <p><strong className="text-foreground dark:text-slate-300">Payment Type:</strong> {purchase.payment_type || 'N/A'}</p>
                            
                            <div className="mt-2 bg-slate-50 p-2 rounded text-xs dark:bg-slate-700/50">
                                <div className="flex justify-between mb-1">
                                    <span>Base Amount:</span>
                                    <span>BHD {Number(purchase.paid_amount).toFixed(3)}</span>
                                </div>
                                {Number(purchase.discount_amount) > 0 && (
                                    <div className="flex justify-between mb-1 text-green-600 dark:text-green-400">
                                        <span>Discount:</span>
                                        <span>- BHD {Number(purchase.discount_amount).toFixed(3)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-600 pt-1 mt-1">
                                    <span>Total Due:</span>
                                    <span>BHD {Number(displayAmount).toFixed(3)}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Booking Dates</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Preferred Date 1:</strong> {purchase.preferred_booking_date ? formatDateSafe(purchase.preferred_booking_date) : 'N/A'}</p>
                            {purchase.additional_preferred_dates && (
                                <>
                                    {purchase.additional_preferred_dates.date2 && <p><strong className="text-foreground dark:text-slate-300">Date 2:</strong> {formatDateSafe(purchase.additional_preferred_dates.date2)}</p>}
                                    {purchase.additional_preferred_dates.date3 && <p><strong className="text-foreground dark:text-slate-300">Date 3:</strong> {formatDateSafe(purchase.additional_preferred_dates.date3)}</p>}
                                    {purchase.additional_preferred_dates.date4 && <p><strong className="text-foreground dark:text-slate-300">Date 4:</strong> {formatDateSafe(purchase.additional_preferred_dates.date4)}</p>}
                                </>
                            )}
                        </div>
                        {purchase.selected_addons && purchase.selected_addons.length > 0 && (
                            <div className="md:col-span-2">
                                <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><CheckSquare className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Selected Add-ons</h4>
                                <ul className="list-disc list-inside pl-1">
                                    {purchase.selected_addons.map((addon, index) => (
                                        <li key={index}>{addon.name} - ${Number(addon.price).toFixed(2)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         <div className="md:col-span-2">
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><DollarSign className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Customer & Address</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Name:</strong> {purchase.name || 'N/A'}</p>
                            <p><strong className="text-foreground dark:text-slate-300">Email:</strong> {purchase.email || 'N/A'}</p>
                            {purchase.address && (
                                <p><strong className="text-foreground dark:text-slate-300">Address:</strong> 
                                    {`${purchase.address.street || ''}, ${purchase.address.city || ''}, ${purchase.address.state || ''} ${purchase.address.zip || ''} ${purchase.address.country || ''}`.replace(/, , /g, ', ').replace(/, $/, '').trim() || 'N/A'}
                                </p>
                            )}
                        </div>
                        
                        <div className="md:col-span-2 pt-4 flex gap-3 border-t mt-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-xs"
                                onClick={() => handleContactSupport(purchase.purchase_ref_id, purchase.product_name)}
                            >
                                <MessageSquare className="mr-2 h-3 w-3" /> Contact Support
                            </Button>
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleReportIssue(purchase.purchase_ref_id, purchase.product_name)}
                            >
                                <AlertTriangle className="mr-2 h-3 w-3" /> Report Issue
                            </Button>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                );
              })}
            </Accordion>
        )}

        <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-2">Need help with something else?</h3>
            <Button onClick={() => navigate('/contact')} className="w-full sm:w-auto" variant="outline">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Reporting A Problem
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseHistoryTab;