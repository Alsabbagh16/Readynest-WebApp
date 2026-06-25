import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, PlusCircle, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const stripTimezone = (dateString) => dateString?.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') || '';

const parseJobDate = (dateString) => {
  const cleanDateString = stripTimezone(dateString);
  return cleanDateString ? new Date(cleanDateString) : null;
};

const getAreaLabel = (address) => {
  if (!address) return 'No area';
  if (typeof address === 'object') return address.city || address.area || address.street || 'No area';
  return address;
};

const getStatusClasses = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('complete')) return 'border-l-slate-400 bg-slate-50 text-slate-700';
  if (normalizedStatus.includes('progress') || normalizedStatus.includes('active')) return 'border-l-emerald-500 bg-emerald-50 text-emerald-800';
  if (normalizedStatus.includes('cancel')) return 'border-l-red-500 bg-red-50 text-red-800';
  if (normalizedStatus.includes('pending')) return 'border-l-amber-500 bg-amber-50 text-amber-800';
  return 'border-l-sky-500 bg-sky-50 text-sky-800';
};

const getStatusDotClassName = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('complete')) return 'bg-slate-400';
  if (normalizedStatus.includes('progress') || normalizedStatus.includes('active')) return 'bg-emerald-500';
  if (normalizedStatus.includes('cancel')) return 'bg-red-500';
  if (normalizedStatus.includes('pending')) return 'bg-amber-500';
  return 'bg-sky-500';
};

const DayJobPill = ({ job }) => {
  const jobDate = parseJobDate(job.preferred_date);
  const employeeCount = job.assigned_employees_ids?.length || job.employees_data?.length || 0;

  return (
    <div className={`rounded-lg border border-slate-100 border-l-4 px-2 py-1.5 shadow-sm ${getStatusClasses(job.status)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold">{jobDate ? format(jobDate, 'h:mm a') : 'No time'}</span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotClassName(job.status)}`} />
      </div>
      <p className="mt-0.5 truncate text-[11px] font-medium">{job.user_name || 'Guest'} - {getAreaLabel(job.user_address)}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[10px] opacity-75">
        <Users className="h-3 w-3" /> {employeeCount || 'No'} cleaner{employeeCount === 1 ? '' : 's'}
      </p>
    </div>
  );
};

const JobsCalendarTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminProfile } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          job_ref_id,
          created_at,
          user_name,
          user_email,
          user_phone,
          preferred_date,
          status,
          purchase_ref_id,
          user_address,
          assigned_employees_ids
        `);

      // Task 5 Logic: 
      // if isSuperadmin OR (hasUiRoles AND hasPerm('jobs.view_all')) -> fetch all
      // else (including legacy users without roles) -> fetch assigned only
      
      const canViewAll = isSuperadmin || (hasUiRoles && hasPerm('jobs.view_all'));
      
      if (adminProfile && !canViewAll) {
        // Fetch only jobs assigned to current employee
        query = query.contains('assigned_employees_ids', [adminProfile.id]);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      let jobsWithEmployees = data || [];

      // Fetch employee details for tooltips/modals
      if (jobsWithEmployees.length > 0) {
          const { data: employees } = await supabase.from('employees').select('id, full_name, email');
          if (employees) {
              const empMap = new Map(employees.map(e => [e.id, e]));
              jobsWithEmployees = jobsWithEmployees.map(job => {
                  const empIds = job.assigned_employees_ids || [];
                  const empData = empIds.map(id => empMap.get(id)).filter(Boolean);
                  return { ...job, employees_data: empData };
              });
          }
      }

      setJobs(jobsWithEmployees);
    } catch (error) {
      console.error("Error fetching jobs for calendar:", error, { hasUiRoles, isSuperadmin });
      toast({ title: "Error", description: "Could not fetch calendar data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, adminProfile, hasPerm, isSuperadmin, hasUiRoles]);

  useEffect(() => {
    if (adminProfile) {
        fetchJobs();
    }
  }, [fetchJobs, adminProfile]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const jobsByDate = useMemo(() => {
    const groups = new Map();
    jobs.forEach((job) => {
      const jobDate = parseJobDate(job.preferred_date);
      if (!jobDate) return;
      const dayKey = format(jobDate, 'yyyy-MM-dd');
      const dayJobs = groups.get(dayKey) || [];
      dayJobs.push(job);
      groups.set(dayKey, dayJobs);
    });

    groups.forEach((dayJobs) => {
      dayJobs.sort((a, b) => {
        const aDate = parseJobDate(a.preferred_date);
        const bDate = parseJobDate(b.preferred_date);
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });
    });

    return groups;
  }, [jobs]);

  const visibleMonthJobs = useMemo(() => (
    jobs.filter((job) => {
      const jobDate = parseJobDate(job.preferred_date);
      return jobDate && isSameMonth(jobDate, currentMonth);
    })
  ), [jobs, currentMonth]);

  const goToDay = (day) => {
    navigate(`/admin-dashboard/jobs/day/${format(day, 'yyyy-MM-dd')}`);
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading calendar...</span>
        </div>
    );
  }

  const canCreateJob = isSuperadmin || (hasUiRoles ? hasPerm('jobs.create') : true); // Legacy: true if no roles

  return (
    <div className="min-h-full bg-slate-50 p-3 sm:p-5">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center text-2xl font-bold text-slate-950">
                <span className="mr-3 rounded-2xl bg-blue-50 p-2 text-blue-600">
                  <CalendarDays className="h-6 w-6" />
                </span>
                Jobs Calendar
              </CardTitle>
              <CardDescription>Monthly workload overview. Select a day to open the time-slot scheduler.</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth((month) => addMonths(month, -1))} className="rounded-xl">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin-dashboard/jobs/day/${format(new Date(), 'yyyy-MM-dd')}`)}
                className="rounded-xl"
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth((month) => addMonths(month, 1))} className="rounded-xl">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
              {canCreateJob && (
                <Button asChild size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700">
                  <Link to="/admin-dashboard/job/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Job
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Current Month</p>
              <p className="text-2xl font-bold text-slate-950">{format(currentMonth, 'MMMM yyyy')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-400">Jobs</p>
                <p className="text-xl font-bold text-slate-950">{visibleMonthJobs.length}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-400">Scheduled</p>
                <p className="text-xl font-bold text-sky-600">
                  {visibleMonthJobs.filter((job) => String(job.status || '').toLowerCase().includes('scheduled')).length}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-400">Active</p>
                <p className="text-xl font-bold text-emerald-600">
                  {visibleMonthJobs.filter((job) => String(job.status || '').toLowerCase().includes('progress')).length}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-400">Completed</p>
                <p className="text-xl font-bold text-slate-600">
                  {visibleMonthJobs.filter((job) => String(job.status || '').toLowerCase().includes('complete')).length}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5">
          <div className="hidden grid-cols-7 gap-2 pb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {monthDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayJobs = jobsByDate.get(dayKey) || [];
              const visibleDayJobs = dayJobs.slice(0, 4);
              const overflowCount = Math.max(0, dayJobs.length - visibleDayJobs.length);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => goToDay(day)}
                  className={`flex min-h-[168px] flex-col items-stretch justify-start rounded-2xl border p-3 text-left align-top transition hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm ${
                    isCurrentMonth ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50/70 opacity-70'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold ${
                        isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <p className="mt-1 text-[11px] font-medium text-slate-400 sm:hidden">{format(day, 'EEE, MMM d')}</p>
                    </div>
                    {dayJobs.length > 0 && (
                      <Badge variant="outline" className="rounded-lg border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                        {dayJobs.length} job{dayJobs.length === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>

                  {visibleDayJobs.length > 0 ? (
                    <div className="space-y-2">
                      {visibleDayJobs.map((job) => (
                        <DayJobPill key={job.job_ref_id} job={job} />
                      ))}
                      {overflowCount > 0 && (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1 text-center text-[11px] font-semibold text-slate-500">
                          +{overflowCount} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-[80px] items-start justify-center rounded-xl border border-dashed border-slate-100 pt-4 text-xs text-slate-300">
                      No jobs
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              ['Scheduled', 'bg-sky-100 text-sky-700 border-sky-200'],
              ['In Progress', 'bg-emerald-100 text-emerald-700 border-emerald-200'],
              ['Pending', 'bg-amber-100 text-amber-700 border-amber-200'],
              ['Completed', 'bg-slate-100 text-slate-700 border-slate-200'],
            ].map(([label, className]) => (
              <span key={label} className={`rounded-xl border px-3 py-2 ${className}`}>{label}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobsCalendarTab;
