import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Eye, 
  PlayCircle, 
  Clock, 
  MapPin,
  Calendar,
  MoreHorizontal,
  PlusCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Users,
  Repeat2
} from "lucide-react";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { shareJobToPartTimers } from '@/lib/storage/jobStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/components/ui/use-toast";

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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  switch (filter) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'yesterday':
      return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'tomorrow':
      return { start: tomorrow, end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1) };
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

const RecentServicesTab = ({ onStartJob, refreshTrigger }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // preset date ranges
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' }); // custom date range
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [shareDialogJob, setShareDialogJob] = useState(null);
  const [shareForm, setShareForm] = useState({
    slots_available: '',
    hours_needed: '',
    hourly_pay: '',
    transport_included: 'false',
  });
  const [isSharingJob, setIsSharingJob] = useState(false);
  const { adminProfile } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles, currentEmployee } = usePermissionContext();
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs(1, true);
  }, [adminProfile, refreshTrigger, hasPerm, isSuperadmin, hasUiRoles, currentEmployee]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    fetchJobs(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1,
      totalPages: Math.ceil(prev.totalItems / newItemsPerPage)
    }));
    fetchJobs(1, true);
  };

  const fetchJobs = async (page = 1, resetPagination = false) => {
    try {
      setLoading(true);
      
      // Fetch all jobs for client-side filtering
      let query = supabase
        .from('jobs')
        .select(`
            *,
            purchase:purchases(product_name, purchase_ref_id, is_subscription),
            user:profiles(first_name, last_name, email)
        `)
        .order('preferred_date', { ascending: false });

      // Task 6 Logic: if isSuperadmin OR (hasUiRoles AND hasPerm('jobs.view_all')) -> fetch all
      const canViewAll = isSuperadmin || (hasUiRoles && hasPerm('jobs.view_all'));

      if (!canViewAll) {
        // Use currentEmployee.id (from employees table) for filtering assigned_employees_ids
        const employeeId = currentEmployee?.id;
        
        if (employeeId) {
          // Filter by assigned employee ID
          query = query.contains('assigned_employees_ids', [employeeId]);
        } else if (adminProfile?.id) {
          // Fallback to adminProfile.id if currentEmployee not available
          query = query.contains('assigned_employees_ids', [adminProfile.id]);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching jobs:", error, {
          hasUiRoles,
          isSuperadmin,
          employeeId: currentEmployee?.id,
          profileId: adminProfile?.id,
          errorDetails: error
        });
        throw error;
      }
      
      // Set all jobs for client-side filtering
      setJobs(data || []);
      
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
    } catch (error) {
      console.error("Failed to fetch jobs:", error, {
        hasUiRoles,
        isSuperadmin,
        employeeId: currentEmployee?.id,
        profileId: adminProfile?.id,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'on hold': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const deleteJob = async (jobRefId) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('job_ref_id', jobRefId);
      if (error) throw error;
      toast({ title: "Success", description: `Job ${jobRefId} has been permanently deleted.` });
      fetchJobs(1, true); 
    } catch (error) {
      console.error(`Error deleting job:`, error);
      toast({ title: "Error", description: `Could not delete job ${jobRefId}.`, variant: "destructive" });
    }
  };

  const openShareDialog = (job) => {
    setShareDialogJob(job);
    setShareForm({
      slots_available: job.slots_available ? String(job.slots_available) : '',
      hours_needed: job.hours_needed ? String(job.hours_needed) : '',
      hourly_pay: job.hourly_pay ? String(job.hourly_pay) : '',
      transport_included: job.transport_included ? 'true' : 'false',
    });
  };

  const handleShareFormChange = (event) => {
    const { name, value } = event.target;
    setShareForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleShareToPartTimers = async () => {
    if (!shareDialogJob) return;

    setIsSharingJob(true);
    try {
      await shareJobToPartTimers(shareDialogJob.job_ref_id, {
        ...shareForm,
        transport_included: shareForm.transport_included === 'true',
      });
      toast({
        title: 'Job Shared',
        description: `${shareDialogJob.job_ref_id} is now visible on the part-time job board.`,
      });
      setShareDialogJob(null);
      fetchJobs(1, true);
    } catch (error) {
      toast({
        title: 'Unable to Share Job',
        description: error.message || 'Please check the posting details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharingJob(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      job.job_ref_id?.toLowerCase().includes(searchLower) ||
      job.user_name?.toLowerCase().includes(searchLower) ||
      job.user_email?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'All' || 
    (statusFilter === 'Pending' && (job.status === 'Pending' || job.status === 'Pending Assignment')) ||
    (statusFilter !== 'Pending' && job.status === statusFilter);

    let matchesQuickFilter = true;
    if (quickFilter === 'today' || quickFilter === 'tomorrow') {
      const todayRange = getDateRange(quickFilter);
      const jobDate = job.preferred_date ? new Date(job.preferred_date) : null;
      matchesQuickFilter = Boolean(jobDate && !Number.isNaN(jobDate.getTime()) && jobDate >= todayRange.start && jobDate <= todayRange.end);
    } else if (quickFilter === 'subscription') {
      matchesQuickFilter = job.purchase?.is_subscription === true;
    }

    // Date range filtering
    let matchesDateRange = true;
    if (dateRangeFilter !== 'all') {
      if (dateRangeFilter === 'custom') {
        // Custom date range filtering
        if (customDateRange.start || customDateRange.end) {
          const jobDate = new Date(job.preferred_date);
          const startDate = customDateRange.start ? new Date(customDateRange.start) : null;
          const endDate = customDateRange.end ? new Date(customDateRange.end) : null;
          
          if (startDate && jobDate < startDate) matchesDateRange = false;
          if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (jobDate > endOfDay) matchesDateRange = false;
          }
        }
      } else {
        // Preset date range filtering
        const range = getDateRange(dateRangeFilter);
        if (range) {
          const jobDate = new Date(job.preferred_date);
          
          if (range.start && jobDate < range.start) matchesDateRange = false;
          if (range.end && jobDate > range.end) matchesDateRange = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDateRange && matchesQuickFilter;
  });

  // Update pagination based on filtered results
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: filteredJobs.length,
      totalPages: Math.ceil(filteredJobs.length / prev.itemsPerPage),
      currentPage: 1 // Reset to first page when filters change
    }));
  }, [filteredJobs.length, pagination.itemsPerPage, quickFilter]);

  // Get paginated data from filtered results
  const getPaginatedJobs = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  };

  const canCreateJob = isSuperadmin || (hasUiRoles ? hasPerm('jobs.create') : true);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Jobs List</h2>
          <p className="text-sm text-gray-500">Manage and track service appointments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search jobs..."
                  className="pl-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="pl-9 bg-white w-full md:w-40">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger className="pl-9 bg-white w-full md:w-40">
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
                      className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md w-full md:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                    <input
                      type="date"
                      placeholder="End date"
                      className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md w-full md:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              {canCreateJob && (
                <Button asChild className="shrink-0">
                  <Link to="/admin-dashboard/job/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Job
                  </Link>
                </Button>
              )}
        </div>
      </div>

      <div className="mb-4 flex w-full gap-1 rounded-md border border-slate-200 bg-white p-1 sm:w-fit">
        {[
          { value: 'all', label: 'All', icon: Filter },
          { value: 'today', label: 'Today', icon: Calendar },
          { value: 'tomorrow', label: 'Tomorrow', icon: Calendar },
          { value: 'subscription', label: 'Subscription', icon: Repeat2 },
        ].map((option) => <Button key={option.value} type="button" size="sm" variant={quickFilter === option.value ? 'default' : 'ghost'} className="min-w-0 flex-1 px-2 sm:flex-none sm:px-3" onClick={() => setQuickFilter(option.value)}><option.icon className="mr-1 h-4 w-4 shrink-0 sm:mr-2" />{option.value === 'subscription' ? <><span className="sm:hidden">Sub</span><span className="hidden sm:inline">Subscription</span></> : option.label}</Button>)}
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Purchase ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">Loading jobs...</TableCell>
                </TableRow>
            ) : getPaginatedJobs().length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">No jobs found matching your criteria.</TableCell>
                </TableRow>
            ) : (
                getPaginatedJobs().map((job) => (
                <TableRow key={job.job_ref_id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium">
                        <Link to={`/admin-dashboard/job/${job.job_ref_id}`} className="text-primary hover:underline">
                            {job.job_ref_id}
                        </Link>
                    </TableCell>
                    <TableCell>
                        {job.purchase_ref_id ? (
                            <Link to={`/admin-dashboard/purchase/${job.purchase_ref_id}`} className="text-primary hover:underline font-mono text-sm">
                                {job.purchase_ref_id}
                            </Link>
                        ) : (
                            <span className="text-gray-400 text-sm">No purchase</span>
                        )}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">{job.user_name || 'Guest'}</span>
                            <span className="text-xs text-gray-500">{job.user_phone}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <span className="text-sm">{job.purchase?.product_name || 'Service'}</span>
                    </TableCell>
                    <TableCell>
                         <div className="flex flex-col text-sm">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {formatDateSafe(job.preferred_date, 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDateSafe(job.preferred_date, 'h:mm a')}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                         <div className="flex items-center gap-1 text-sm text-gray-600 max-w-[150px] truncate" title={job.user_address?.label || job.user_address?.street}>
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            {[
                              job.user_address?.city,
                              job.user_address?.block_number
                                || job.user_address?.block
                                || job.user_address?.zip
                                || job.user_address?.zip_code,
                            ].filter(Boolean).join(', ') || 'Location'}
                         </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={getStatusColor(job.status)}>
                            {job.status}
                        </Badge>
                        {job.is_shared_to_part_time && (
                          <Badge variant="outline" className="ml-2 border-sky-200 bg-sky-50 text-sky-700">
                            Part-Time
                          </Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                             {(job.status === 'Scheduled' || job.status === 'Pending' || job.status === 'In Progress') && (
                                <Button
                                    size="sm"
                                    className={`h-8 px-2 text-xs ${job.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    variant={job.status === 'In Progress' ? 'outline' : 'default'}
                                    onClick={() => onStartJob && onStartJob(job)}
                                >
                                    {job.status === 'In Progress' ? (
                                        <>
                                            <Clock className="h-3 w-3 mr-1 animate-pulse" /> Resume
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle className="h-3 w-3 mr-1" /> Start
                                        </>
                                    )}
                                </Button>
                             )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                        <Link to={`/admin-dashboard/job/${job.job_ref_id}`}>
                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        openShareDialog(job);
                                      }}
                                    >
                                      <Users className="mr-2 h-4 w-4" /> Share to Part-Timers
                                    </DropdownMenuItem>
                                    {(adminProfile?.role === 'superadmin' || isSuperadmin) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem 
                                                    className="text-red-600 focus:text-red-600"
                                                    onSelect={(e) => e.preventDefault()}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Job
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-red-600">
                                                        Are you sure you want to permanently delete job {job.job_ref_id}? 
                                                        This action cannot be undone and will remove all associated data.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-red-500 hover:bg-red-600"
                                                        onClick={() => deleteJob(job.job_ref_id)}
                                                    >
                                                        Delete Permanently
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!loading && pagination.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 p-4 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} jobs
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

      <Dialog open={!!shareDialogJob} onOpenChange={(open) => !open && setShareDialogJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share to Part-Timers</DialogTitle>
            <DialogDescription>
              Publish {shareDialogJob?.job_ref_id} to the public part-time job board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="part-time-slots">Slots Available</Label>
              <Input
                id="part-time-slots"
                name="slots_available"
                type="number"
                min="1"
                step="1"
                value={shareForm.slots_available}
                onChange={handleShareFormChange}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="part-time-hours">Hours Needed</Label>
              <Input
                id="part-time-hours"
                name="hours_needed"
                type="number"
                min="0.5"
                step="0.5"
                value={shareForm.hours_needed}
                onChange={handleShareFormChange}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="part-time-pay">Hourly Pay (BD)</Label>
              <Input
                id="part-time-pay"
                name="hourly_pay"
                type="number"
                min="0"
                step="0.001"
                value={shareForm.hourly_pay}
                onChange={handleShareFormChange}
                placeholder="2.400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="part-time-transport">Transport Included?</Label>
              <Select
                value={shareForm.transport_included}
                onValueChange={(value) => setShareForm((currentForm) => ({ ...currentForm, transport_included: value }))}
              >
                <SelectTrigger id="part-time-transport">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShareDialogJob(null)} disabled={isSharingJob}>
              Cancel
            </Button>
            <Button type="button" onClick={handleShareToPartTimers} disabled={isSharingJob}>
              {isSharingJob ? 'Sharing...' : 'Share Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecentServicesTab;
