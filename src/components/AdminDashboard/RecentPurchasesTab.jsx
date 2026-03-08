
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCcw, Download, Edit, XCircle, ShoppingCart, ExternalLink, Phone, Tag, Mail, User, PlusCircle, FileText, CalendarDays, ChevronLeft, ChevronRight, Search, Filter, AlertTriangle } from 'lucide-react';
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

const formatDateSafe = (dateString, includeTime = true) => {
  try {
    if (!dateString) return '—';
    const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
    const dateObj = new Date(cleanDateString);
    if (isNaN(dateObj.getTime())) return '—';
    return format(dateObj, includeTime ? 'MMM d, yyyy, HH:mm' : 'MMM d, yyyy');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return '—';
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

const createColumnConfig = (onUpdateStatus) => [
  {
    header: "Ref No.",
    accessor: "purchase_ref_id",
    className: "font-mono w-[140px]",
    cell: (purchase) => (
      <div className="flex flex-col">
        <Link 
            to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`} 
            className="text-primary hover:underline flex items-center"
        >
            {purchase.purchase_ref_id} <ExternalLink className="h-3 w-3 ml-1"/>
        </Link>
        {purchase.purchase_ref_id?.startsWith('GEN-') && (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                (Auto-generated)
            </span>
        )}
      </div>
    ),
    csvFn: (purchase) => purchase.purchase_ref_id
  },
  {
    header: "Date",
    accessor: "preferred_booking_date",
    className: "w-[160px]",
    cell: (purchase) => {
      const displayDate = formatPreferredBookingDateForAdmin(purchase.preferred_booking_date);
      // Dev logging as requested
      if (purchase.preferred_booking_date) {
        console.log(`[RecentPurchases Column] Raw: ${purchase.preferred_booking_date} | Formatted: ${displayDate} | TZ: Asia/Bahrain (UTC+3)`);
      }
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-sm font-medium text-foreground">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-primary" />
            {displayDate}
          </div>
          <span className="text-xs text-muted-foreground ml-5">
            Created: {formatDateSafe(purchase.created_at, false)}
          </span>
        </div>
      );
    },
    csvFn: (purchase) => formatPreferredBookingDateForAdmin(purchase.preferred_booking_date)
  },
  {
    header: "Customer",
    accessor: "name",
    className: "min-w-[180px]",
    cell: (purchase) => (
      <div>
        <div className="flex items-center font-medium">
           <User className="h-3 w-3 mr-1 text-muted-foreground" /> {purchase.name || 'Guest'}
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-0.5">
           <Mail className="h-3 w-3 mr-1" /> {purchase.email || 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-0.5">
            <Phone className="h-3 w-3 mr-1" /> 
            {purchase.user_phone || (purchase.profiles?.phone) || 'N/A'}
        </div>
      </div>
    ),
    csvFn: (purchase) => {
      const parts = [purchase.name || 'Guest'];
      if (purchase.email) parts.push(`<${purchase.email}>`);
      const phone = purchase.user_phone || purchase.profiles?.phone;
      if (phone) parts.push(`(Ph: ${phone})`);
      return parts.join(' ');
    }
  },
  {
    header: "Product",
    accessor: "product_name",
    className: "min-w-[120px]",
    cell: (purchase) => {
      const productName = purchase.product_name || 'Unknown Product';
      if (!purchase.product_id) {
          return (
              <span className="text-slate-500 italic flex items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-300 mr-2"></span>
                  {productName}
              </span>
          );
      }
      return productName;
    },
    csvFn: (purchase) => !purchase.product_id ? 'Custom Purchase' : (purchase.product_name || 'N/A')
  },
  {
    header: "Base Amount",
    accessor: "paid_amount",
    className: "text-right",
    cell: (purchase) => `BHD ${Number(purchase.paid_amount).toFixed(3)}`,
    csvFn: (purchase) => Number(purchase.paid_amount).toFixed(3)
  },
  {
    header: "Discount",
    accessor: "discount_amount",
    className: "text-right",
    cell: (purchase) => {
       const discount = Number(purchase.discount_amount || 0);
       return discount > 0 ? (
         <span className="text-green-600 dark:text-green-400 font-medium">
           - BHD {discount.toFixed(3)}
         </span>
       ) : '-';
    },
    csvFn: (purchase) => Number(purchase.discount_amount || 0).toFixed(3)
  },
  {
    header: "Final Amount",
    accessor: "final_amount_due_on_arrival",
    className: "text-right",
    cell: (purchase) => {
      const finalAmount = purchase.final_amount_due_on_arrival !== null 
        ? Number(purchase.final_amount_due_on_arrival)
        : Number(purchase.paid_amount);
      const isDiscounted = Number(purchase.discount_amount) > 0 || !!purchase.coupon_code;
      
      return (
        <div className={`py-1 px-2 rounded-md inline-block ${isDiscounted ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
           <span className={`font-bold ${isDiscounted ? 'text-green-700 dark:text-green-400' : ''}`}>
             BHD {finalAmount.toFixed(3)}
           </span>
        </div>
      );
    },
    csvFn: (purchase) => {
       const val = purchase.final_amount_due_on_arrival !== null 
        ? Number(purchase.final_amount_due_on_arrival) 
        : Number(purchase.paid_amount);
       return val.toFixed(3);
    }
  },
  {
    header: "Coupon",
    accessor: "coupon_code",
    className: "text-center",
    cell: (purchase) => purchase.coupon_code ? (
      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50/80 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
        <Tag className="w-3 h-3 mr-1" />
        {purchase.coupon_code}
      </Badge>
    ) : '-',
    csvFn: (purchase) => purchase.coupon_code || ''
  },
  {
    header: "Status",
    accessor: "status",
    className: "text-center",
    cell: (purchase) => (
      <Badge variant={getStatusBadgeVariant(purchase.status)} className="capitalize whitespace-nowrap flex items-center gap-1">
        {purchase.status || 'Unknown'}
        {purchase.status === 'Flagged' && <AlertTriangle className="w-3 h-3" />}
      </Badge>
    ),
    csvFn: (purchase) => purchase.status || 'Unknown'
  }
];

const RecentPurchasesTab = ({ refreshTrigger }) => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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

  const fetchPurchases = useCallback(async (page = 1, resetPagination = false) => {
    setLoading(true);
    try {
      const itemsPerPage = pagination.itemsPerPage;
      const offset = (page - 1) * itemsPerPage;
      
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
        .order('created_at', { ascending: false })
        .range(offset, itemsPerPage);

      // Get total count for pagination
      const { count } = await supabase
        .from('purchases')
        .select('count', { count: 'exact', head: true });

      const canViewAll = isSuperadmin || (hasUiRoles && hasPerm('purchases.view_all'));

      if (!canViewAll && adminUser?.id) {
          query = query.eq('user_id', adminUser.id);
          
          // Get filtered count
          const { count: filteredCount } = await supabase
            .from('purchases')
            .select('count', { count: 'exact', head: true })
            .eq('user_id', adminUser.id);
          
          if (filteredCount !== null) {
            setPagination(prev => ({
              ...prev,
              totalItems: filteredCount,
              totalPages: Math.ceil(filteredCount / itemsPerPage)
            }));
          }
      } else {
        setPagination(prev => ({
          ...prev,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / itemsPerPage)
        }));
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase select error in RecentPurchasesTab:", error);
        throw error;
      }
      
      if (resetPagination) {
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / itemsPerPage)
        }));
      }
      
      setPurchases(data || []);
      setFilteredPurchases(data || []);
    } catch (error) {
      console.error("Error fetching purchases:", error, { hasUiRoles, isSuperadmin });
      toast({ title: "Error", description: "Could not fetch purchases.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, adminUser, hasPerm, isSuperadmin, hasUiRoles, pagination.itemsPerPage]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    fetchPurchases(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1,
      totalPages: Math.ceil(prev.totalItems / newItemsPerPage)
    }));
    fetchPurchases(1, true);
  };

  useEffect(() => {
    fetchPurchases(1, true);
  }, [fetchPurchases, refreshTrigger]);

  useEffect(() => {
    // Filter purchases based on search term and status filter
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
    
    setFilteredPurchases(filtered);
  }, [purchases, searchTerm, statusFilter]);

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

  const columnConfig = createColumnConfig(updatePurchaseStatusInList);
  
  const handleExport = () => {
    if (purchases.length === 0) {
      toast({ title: "No Data", description: "There are no purchases to export." });
      return;
    }

    const headers = columnConfig.map(col => col.header);
    const csvRows = [headers.join(",")];

    purchases.forEach(p => {
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
    link.setAttribute("download", `purchases_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Purchases CSV file downloaded." });
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
              <Button onClick={handleExport} size="sm" variant="outline" disabled={purchases.length === 0}>
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
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPurchases.length === 0 ? (
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
                {filteredPurchases.map((purchase) => (
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
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
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
                              >
                                <RefreshCcw className="h-3 w-3 mr-1" /> Refund
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
                      
                      <PermissionGate permission="purchases.edit">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructiveOutline"
                                size="sm"
                                className="text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700"
                                disabled={purchase.status === 'Cancelled' || purchase.status === 'Refunded' || purchase.status === 'Completed'}
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cancel purchase {purchase.purchase_ref_id}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => updatePurchaseStatusInList(purchase.purchase_ref_id, 'Cancelled', `Marked as cancelled.`)}
                                >
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </PermissionGate>
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
                  value={pagination.itemsPerPage.toString()} 
                  onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
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
