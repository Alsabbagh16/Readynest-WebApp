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
  Filter
} from "lucide-react";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const RecentServicesTab = ({ onStartJob, refreshTrigger }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { adminProfile } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles, currentEmployee } = usePermissionContext();

  useEffect(() => {
    fetchJobs();
  }, [adminProfile, refreshTrigger, hasPerm, isSuperadmin, hasUiRoles, currentEmployee]);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('jobs')
        .select(`
            *,
            purchase:purchases(product_name, purchase_ref_id),
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

      setJobs(data || []);
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
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      job.job_ref_id?.toLowerCase().includes(searchLower) ||
      job.user_name?.toLowerCase().includes(searchLower) ||
      job.user_email?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
            ) : filteredJobs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">No jobs found matching your criteria.</TableCell>
                </TableRow>
            ) : (
                filteredJobs.map((job) => (
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
                            {job.user_address?.city || 'Location'}
                         </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={getStatusColor(job.status)}>
                            {job.status}
                        </Badge>
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
    </div>
  );
};

export default RecentServicesTab;