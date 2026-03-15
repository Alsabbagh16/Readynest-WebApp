
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCcw, Download, Edit, XCircle, ShoppingCart, ExternalLink, Phone, Tag, Mail, User, PlusCircle, FileText, CalendarDays, Calendar, ChevronLeft, ChevronRight, Search, Filter, AlertTriangle, Trash2, Clock, Eye, MoreHorizontal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import CreatePurchaseModal from './CreatePurchaseModal';
import InvoiceModal from '@/components/AdminDashboard/InvoiceModal';
import PermissionGate from '@/components/PermissionGate';
import { formatPreferredBookingDateForAdmin } from '@/lib/dateTimeHelpers';

const formatDateSafe = (dateString, formatStr) => {
  try {
    if (!dateString) return 'N/A';
    const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
    const date = new Date(cleanDateString);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

const getDateRange = (filter) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (filter) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'yesterday':
      return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: new Date(now.getTime() + 24 * 60 * 60 * 1000 - 1) };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: new Date(now.getTime() + 24 * 60 * 60 * 1000 - 1) };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return { start: startOfLastMonth, end: endOfLastMonth };
    }
    default:
      return null;
  }
};

const getStatusBadgeVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'confirmed':
    case 'paid':
      return 'success';
    case 'pending confirmation':
    case 'pending payment':
    case 'pending':
      return 'default';
    case 'processing':
      return 'outline';
    case 'cancelled':
    case 'failed':
    case 'refunded':
      return 'destructive';
    case 'flagged':
      return 'warning';
    default: return 'secondary';
  }
};

const RecentPurchasesTab = ({ refreshTrigger }) => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // preset date ranges
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' }); // custom date range
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10
  });
  const { toast } = useToast();
  const { adminProfile, adminUser } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeInvoicePurchase, setActiveInvoicePurchase] = useState(null);
  const [viewedPurchases, setViewedPurchases] = useState(() => {
    try {
      const stored = localStorage.getItem('viewedPurchases');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markPurchaseAsViewed = useCallback((purchaseRefId) => {
    setViewedPurchases(prev => {
      const updated = new Set([...prev, purchaseRefId]);
      localStorage.setItem('viewedPurchases', JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  const isPurchaseNew = (createdAt) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
    return hoursSinceCreation <= 48; // Consider "new" if created within 48 hours
  };

  const fetchPurchases = useCallback(async (page = 1, resetPagination = false) => {
    setLoading(true);
    try {
      // Fetch all purchases for client-side filtering
      let query = supabase
        .from('purchases')
        .select(`
          purchase_ref_id,
          created_at,
          name, 
          email,
          user_phone,
          product_name,
          product_id, 
          paid_amount,
          status,
          user_id,
          address,
          payment_type,
          selected_addons,
          preferred_booking_date,
          additional_preferred_dates,
          coupon_code,
          discount_amount,
          final_amount_due_on_arrival,
          profiles!purchases_user_id_fkey ( phone, first_name, last_name ) 
        `)
        .order('created_at', { ascending: false });

      // Task 6 Logic: if isSuperadmin OR (hasUiRoles AND hasPerm('purchases.view_all')) -> fetch all
      const canViewAll = isSuperadmin || (hasUiRoles && hasPerm('purchases.view_all'));

      if (!canViewAll && adminUser?.id) {
        query = query.eq('user_id', adminUser.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase select error in RecentPurchasesTab:", error);
        throw error;
      }
      
      // Set all purchases for client-side filtering
      setPurchases(data || []);
      
      // Get total count for pagination
      const totalCount = data?.length || 0;
      
      if (resetPagination) {
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / prev.itemsPerPage)
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / prev.itemsPerPage)
        }));
      }
      
      setFilteredPurchases(data || []);
    } catch (error) {
      console.error("Error fetching purchases:", error, { hasUiRoles, isSuperadmin });
      toast({ title: "Error", description: "Could not fetch purchases.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, adminUser, hasPerm, isSuperadmin, hasUiRoles]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    const itemsPerPage = newItemsPerPage === 'all' ? filteredPurchases.length : newItemsPerPage;
    setPagination(prev => ({
      ...prev,
      itemsPerPage: itemsPerPage,
      currentPage: 1,
      totalPages: Math.ceil(prev.totalItems / itemsPerPage)
    }));
    fetchPurchases(1, true);
  };

  useEffect(() => {
    fetchPurchases(1, true);
  }, [fetchPurchases, refreshTrigger]);

  useEffect(() => {
    // Filter purchases based on search term, status filter, and date range
    let filtered = purchases;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(purchase => {
        return (
          purchase.purchase_ref_id?.toLowerCase().includes(searchLower) ||
          purchase.name?.toLowerCase().includes(searchLower) ||
          purchase.email?.toLowerCase().includes(searchLower) ||
          purchase.user_phone?.toLowerCase().includes(searchLower) ||
          purchase.product_name?.toLowerCase().includes(searchLower) ||
          purchase.coupon_code?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(purchase => purchase.status === statusFilter);
    }
    
    // Date range filtering
    if (dateRangeFilter !== 'all') {
      if (dateRangeFilter === 'custom') {
        // Custom date range filtering
        if (customDateRange.start || customDateRange.end) {
          filtered = filtered.filter(purchase => {
            const purchaseDate = new Date(purchase.created_at);
            const startDate = customDateRange.start ? new Date(customDateRange.start) : null;
            const endDate = customDateRange.end ? new Date(customDateRange.end) : null;
            
            if (startDate && purchaseDate < startDate) return false;
            if (endDate) {
              const endOfDay = new Date(endDate);
              endOfDay.setHours(23, 59, 59, 999);
              if (purchaseDate > endOfDay) return false;
            }
            
            return true;
          });
        }
      } else {
        // Preset date range filtering
        const range = getDateRange(dateRangeFilter);
        if (range) {
          filtered = filtered.filter(purchase => {
            const purchaseDate = new Date(purchase.created_at);
            
            if (range.start && purchaseDate < range.start) return false;
            if (range.end && purchaseDate > range.end) return false;
            
            return true;
          });
        }
      }
    }
    
    setFilteredPurchases(filtered);
    
    // Update pagination based on filtered results
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.itemsPerPage),
      currentPage: 1 // Reset to first page when filters change
    }));
  }, [purchases, searchTerm, statusFilter, dateRangeFilter, customDateRange]);

  // Get paginated data from filtered results
  const getPaginatedPurchases = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredPurchases.slice(startIndex, endIndex);
  };

  const updatePurchaseStatusInList = async (purchaseRefId, newStatus, successMessage) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('purchase_ref_id', purchaseRefId);
      if (error) throw error;
      toast({ title: "Success", description: successMessage });
      fetchPurchases(1, true); 
    } catch (error) {
      console.error(`Error updating status to ${newStatus}:`, error);
      toast({ title: "Error", description: `Could not update purchase status to ${newStatus}.`, variant: "destructive" });
    }
  };

  const deletePurchase = async (purchaseRefId) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('purchase_ref_id', purchaseRefId);
      if (error) throw error;
      toast({ title: "Success", description: `Purchase ${purchaseRefId} has been permanently deleted.` });
      fetchPurchases(1, true); 
    } catch (error) {
      console.error(`Error deleting purchase:`, error);
      toast({ title: "Error", description: `Could not delete purchase ${purchaseRefId}.`, variant: "destructive" });
    }
  };

  const createColumnConfig = (onUpdateStatus, markAsViewed) => [
    {
      header: "Ref No.",
      accessor: "purchase_ref_id",
      className: "font-mono w-[140px]",
      cell: (purchase) => {
        const isNew = isPurchaseNew(purchase.created_at) && !viewedPurchases.has(purchase.purchase_ref_id);
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {isNew && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-5 animate-pulse">
                  NEW
                </Badge>
              )}
              <Link 
                  to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`} 
                  className="text-primary hover:underline flex items-center"
                  onClick={() => markAsViewed(purchase.purchase_ref_id)}
              >
                  {purchase.purchase_ref_id} <ExternalLink className="h-3 w-3 ml-1"/>
              </Link>
            </div>
            {purchase.purchase_ref_id?.startsWith('GEN-') && (
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                    (Auto-generated)
                </span>
            )}
          </div>
        );
      },
      csvFn: (purchase) => purchase.purchase_ref_id
    },
    {
      header: "Date",
      accessor: "preferred_booking_date",
      className: "w-[160px]",
      cell: (purchase) => {
        const displayDate = formatPreferredBookingDateForAdmin(purchase.preferred_booking_date);
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              {displayDate}
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Clock className="h-3 w-3" />
              {formatDateSafe(purchase.preferred_booking_date, 'h:mm a')}
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              Created: {formatDateSafe(purchase.created_at, 'MMM d, yyyy')}
            </div>
          </div>
        );
      },
      csvFn: (purchase) => formatPreferredBookingDateForAdmin(purchase.preferred_booking_date)
    },
    {
      header: "Customer",
      accessor: "name",
      className: "w-[200px]",
      cell: (purchase) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{purchase.name || 'Guest'}</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            {purchase.email || 'N/A'}
          </div>
          {purchase.user_phone && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="h-3 w-3" />
              {purchase.user_phone}
            </div>
          )}
        </div>
      ),
      csvFn: (purchase) => purchase.name || 'Guest'
    },
    {
      header: "Service",
      accessor: "product_name",
      className: "w-[180px]",
      cell: (purchase) => (
        <div className="flex flex-col">
          <span className="text-sm">{purchase.product_name || 'N/A'}</span>
          {purchase.selected_addons && purchase.selected_addons.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Tag className="h-3 w-3" />
              {purchase.selected_addons.length} addon(s)
            </div>
          )}
        </div>
      ),
      csvFn: (purchase) => purchase.product_name || 'N/A'
    },
    {
      header: "Amount",
      accessor: "paid_amount",
      className: "w-[120px]",
      cell: (purchase) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {purchase.paid_amount ? `BHD ${purchase.paid_amount.toFixed(3)}` : 'N/A'}
          </span>
          {purchase.final_amount_due_on_arrival && purchase.final_amount_due_on_arrival > 0 && (
            <span className="text-xs text-gray-500">
              Due: BHD {purchase.final_amount_due_on_arrival.toFixed(3)}
            </span>
          )}
        </div>
      ),
      csvFn: (purchase) => purchase.paid_amount ? `BHD ${purchase.paid_amount.toFixed(3)}` : 'N/A'
    },
    {
      header: "Status",
      accessor: "status",
      className: "w-[120px]",
      cell: (purchase) => {
        const status = purchase.status || 'pending';
        return (
          <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            {status}
          </Badge>
        );
      },
      csvFn: (purchase) => purchase.status || 'pending'
    },
    {
      header: "Payment",
      accessor: "payment_type",
      className: "w-[100px]",
      cell: (purchase) => (
        <span className="text-sm">{purchase.payment_type || 'N/A'}</span>
      ),
      csvFn: (purchase) => purchase.payment_type || 'N/A'
    },
    {
      header: "Actions",
      accessor: "actions",
      className: "w-[120px]",
      cell: (purchase) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" asChild title="View Purchase">
            <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
              <Eye className="h-3 w-3" />
            </Link>
          </Button>
          
          <PermissionGate permission="purchases.edit">
            <Button variant="outline" size="sm" asChild title="Edit Purchase">
              <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
                <Edit className="h-3 w-3" />
              </Link>
            </Button>
          </PermissionGate>

          <PermissionGate permission="purchases.delete">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Purchase
                  </Link>
                </DropdownMenuItem>
                {(adminProfile?.role === 'superadmin' || isSuperadmin) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Purchase
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-600">
                          Are you sure you want to permanently delete purchase {purchase.purchase_ref_id}? 
                          This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => deletePurchase(purchase.purchase_ref_id)}
                        >
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        </div>
      ),
      csvFn: () => ''
    }
  ];

  const columnConfig = createColumnConfig(updatePurchaseStatusInList, markPurchaseAsViewed);
  
  const handleExport = () => {
    if (filteredPurchases.length === 0) {
      toast({ title: "No Data", description: "There are no purchases to export with the current filters." });
      return;
    }

    const headers = columnConfig.map(col => col.header);
    const csvRows = [headers.join(",")];

    filteredPurchases.forEach(p => {
      const row = columnConfig.map(col => {
         let val = col.csvFn ? col.csvFn(p) : (p[col.accessor] || '');
         const stringVal = String(val).replace(/"/g, '""');
         return `"${stringVal}"`;
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = searchTerm || statusFilter !== 'all' || dateRangeFilter !== 'all' 
      ? `filtered_purchases_export_${new Date().toISOString().split('T')[0]}.csv`
      : `purchases_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const itemCount = filteredPurchases.length;
    const totalItems = purchases.length;
    const message = itemCount === totalItems 
      ? `Exported all ${itemCount} purchases.`
      : `Exported ${itemCount} of ${totalItems} purchases (filtered results).`;
    
    toast({ title: "Export Successful", description: message });
  };

  if (loading) {
    return <div className="p-6 text-center">Loading recent purchases...</div>;
  }

  return (
    <Card className="border-0 shadow-none rounded-none">
      <CardHeader className="flex flex-col space-y-4 pb-2">
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center text-2xl font-bold">
              <ShoppingCart className="mr-3 h-7 w-7 text-primary" />
              Recent Purchases
            </CardTitle>
            <CardDescription>View and manage all customer purchases.</CardDescription>
          </div>
          
          <div className="flex gap-2">
              <Button onClick={handleExport} size="sm" variant="outline" disabled={filteredPurchases.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              
              <PermissionGate permission="purchases.create">
                  <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Purchase
                  </Button>
              </PermissionGate>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search purchases..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="pl-9 bg-white w-full sm:w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="pl-9 bg-white w-full sm:w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {dateRangeFilter === 'custom' && (
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  placeholder="Start date"
                  className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  placeholder="End date"
                  className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {getPaginatedPurchases().length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">
            {searchTerm || statusFilter !== 'All' 
              ? 'No purchases found matching your criteria.' 
              : 'No purchases recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnConfig.map((col, idx) => (
                    <TableHead key={idx} className={col.className}>
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getPaginatedPurchases().map((purchase) => (
                  <TableRow key={purchase.purchase_ref_id}>
                    {columnConfig.map((col, idx) => (
                      <TableCell key={idx} className={col.className}>
                        {col.cell(purchase)}
                      </TableCell>
                    ))}
                    
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <PermissionGate permission="invoices.create">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setActiveInvoicePurchase(purchase)}
                            title="Create Invoice"
                        >
                            <FileText className="h-3 w-3" />
                        </Button>
                      </PermissionGate>
                      
                      <PermissionGate permission="purchases.edit">
                          <Button variant="outline" size="sm" asChild title="Edit Purchase">
                            <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
                              <Edit className="h-3 w-3" />
                            </Link>
                          </Button>
                      </PermissionGate>
                      
                      <PermissionGate permission="purchases.edit">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-yellow-600 border-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                                disabled={purchase.status === 'Refunded' || purchase.status === 'Cancelled'}
                                title="Refund Purchase"
                              >
                                <RefreshCcw className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Mark purchase {purchase.purchase_ref_id} as refunded?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-yellow-500 hover:bg-yellow-600"
                                  onClick={() => updatePurchaseStatusInList(purchase.purchase_ref_id, 'Refunded', `Marked as refunded.`)}
                                >
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </PermissionGate>
                      
                      {/* Delete button - only for superadmins */}
                      {(adminProfile?.role === 'superadmin' || isSuperadmin) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-500 bg-white hover:bg-red-50 hover:text-red-700"
                              title="Delete Purchase"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
                              <AlertDialogDescription className="text-red-600">
                                Are you sure you want to permanently delete purchase {purchase.purchase_ref_id}? 
                                This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => deletePurchase(purchase.purchase_ref_id)}
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && pagination.totalItems > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 p-4 bg-gray-50 border-t">
            <div className="text-sm text-gray-600">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} purchases
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select 
                  value={pagination.itemsPerPage === filteredPurchases.length ? 'all' : pagination.itemsPerPage.toString()} 
                  onValueChange={(value) => handleItemsPerPageChange(value === 'all' ? 'all' : parseInt(value))}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CreatePurchaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchPurchases(1, true)}
      />
      
      <InvoiceModal 
        isOpen={!!activeInvoicePurchase}
        onClose={() => setActiveInvoicePurchase(null)}
        purchase={activeInvoicePurchase}
      />
    </Card>
  );
};

export default RecentPurchasesTab;
