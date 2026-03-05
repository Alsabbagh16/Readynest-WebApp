import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarCheck, Home, Tag, UserCircle, Info, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Modified to strip timezone offset before creating Date object
// This ensures the displayed date matches the stored numbers exactly (Face Value)
const formatDateSafe = (dateString, includeTime = false) => {
    try {
        if (!dateString) return 'N/A';
        // Strip Z and offsets
        const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
        const date = new Date(cleanDateString);
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, includeTime ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy');
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};

const getJobStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed':
             return 'success';
        case 'scheduled':
        case 'confirmed':
             return 'default';
        case 'pending':
        case 'pending assignment':
             return 'outline';
        case 'in progress':
             return 'info';
        case 'cancelled':
        case 'failed':
             return 'destructive';
        default: return 'secondary';
    }
};

const ScheduledCleaningsTab = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize expanded item from location state if available
  const [expandedItem, setExpandedItem] = useState("");

  useEffect(() => {
    if (location.state?.expandedJobId) {
      setExpandedItem(location.state.expandedJobId);
    }
  }, [location.state]);

  const fetchJobs = useCallback(async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          purchases (
            product_name
          )
        `)
        .eq('user_id', user.id)
        .order('preferred_date', { ascending: true }); 

      if (fetchError) {
        throw fetchError;
      }
      
      const processedData = data.map(job => ({
        ...job,
        product_name: job.purchases?.product_name || 'N/A' 
      }));
      setJobs(processedData || []);

    } catch (e) {
      console.error("Error fetching scheduled cleanings:", e);
      setError(e.message || "Failed to fetch scheduled cleanings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleContactSupport = (jobId, productName) => {
    navigate('/contact', {
      state: {
        prefilledMessage: `Hello, I need help regarding my scheduled job (Job Ref: ${jobId}) for ${productName}.`
      }
    });
  };

  const handleReportIssue = (jobId, productName) => {
    navigate('/contact', {
      state: {
        prefilledMessage: `I would like to report an issue with my job (Job Ref: ${jobId}) for ${productName}.`
      }
    });
  };

  if (loading) {
    return <div className="p-6 text-center">Loading your scheduled cleanings...</div>;
  }

  if (error) {
    return (
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader>
          <CardTitle>Scheduled Cleanings</CardTitle>
          <CardDescription>View your upcoming and past scheduled cleaning jobs.</CardDescription>
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
            <CalendarCheck className="mr-3 h-7 w-7 text-primary" />
            Scheduled Cleanings
        </CardTitle>
        <CardDescription>View your upcoming and past scheduled cleaning jobs.</CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
            <div className="text-center py-10">
                <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">You have no scheduled cleanings.</p>
                <p className="text-sm text-muted-foreground">Book a service to see it here.</p>
            </div>
        ) : (
            <Accordion 
              type="single" 
              collapsible 
              className="w-full space-y-3" 
              value={expandedItem} 
              onValueChange={setExpandedItem}
            >
              {jobs.map((job) => (
                <AccordionItem value={job.job_ref_id} key={job.job_ref_id} className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700">
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left">
                        <div className="flex-1 mb-2 md:mb-0">
                            <p className="font-semibold text-primary text-sm md:text-base dark:text-sky-400">{job.product_name || 'Cleaning Service'}</p>
                            <p className="text-xs text-muted-foreground">Job Ref: {job.job_ref_id}</p>
                        </div>
                        <div className="flex items-center space-x-4 md:space-x-6 text-xs md:text-sm">
                            <span className="text-muted-foreground whitespace-nowrap">{formatDateSafe(job.preferred_date)}</span>
                            <Badge variant={getJobStatusBadgeVariant(job.status)} className="capitalize text-xs px-2 py-0.5">{job.status || 'Unknown'}</Badge>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 border-t border-border dark:border-slate-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><Tag className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Job Details</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Reference:</strong> {job.job_ref_id}</p>
                            {job.purchase_ref_id && <p><strong className="text-foreground dark:text-slate-300">Purchase Ref:</strong> {job.purchase_ref_id}</p>}
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><Clock className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Date & Status</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Scheduled Date:</strong> {formatDateSafe(job.preferred_date)}</p>
                            <p><strong className="text-foreground dark:text-slate-300">Status:</strong> <Badge variant={getJobStatusBadgeVariant(job.status)} className="capitalize">{job.status || 'Unknown'}</Badge></p>
                        </div>
                         <div className="md:col-span-2">
                            <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><UserCircle className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Customer Information</h4>
                            <p><strong className="text-foreground dark:text-slate-300">Name:</strong> {job.user_name || 'N/A'}</p>
                            <p><strong className="text-foreground dark:text-slate-300">Email:</strong> {job.user_email || 'N/A'}</p>
                            <p><strong className="text-foreground dark:text-slate-300">Phone:</strong> {job.user_phone || 'N/A'}</p>
                        </div>
                        {job.user_address && (
                            <div className="md:col-span-2">
                                <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><Home className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Service Address</h4>
                                <p>
                                    {`${job.user_address.street || ''}, ${job.user_address.city || ''}, ${job.user_address.state || ''} ${job.user_address.zip || ''}`.replace(/, , /g, ', ').replace(/, $/, '').trim() || 'N/A'}
                                </p>
                            </div>
                        )}
                        {job.addons && job.addons.length > 0 && (
                            <div className="md:col-span-2">
                                <h4 className="font-semibold text-muted-foreground mb-1 flex items-center"><Info className="h-4 w-4 mr-2 text-primary dark:text-sky-400" />Selected Add-ons</h4>
                                <ul className="list-disc list-inside pl-1">
                                    {job.addons.map((addon, index) => (
                                        <li key={index}>{addon.name} - ${Number(addon.price).toFixed(2)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="md:col-span-2 pt-4 flex gap-3 border-t mt-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-xs"
                                onClick={() => handleContactSupport(job.job_ref_id, job.product_name)}
                            >
                                <MessageSquare className="mr-2 h-3 w-3" /> Contact Support
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleReportIssue(job.job_ref_id, job.product_name)}
                            >
                                <AlertTriangle className="mr-2 h-3 w-3" /> Report Issue
                            </Button>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduledCleaningsTab;