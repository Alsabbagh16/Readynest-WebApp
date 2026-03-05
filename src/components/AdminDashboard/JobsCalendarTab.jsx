import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, PlusCircle } from 'lucide-react';
import DayViewModal from './DayViewModal';
import { Link } from 'react-router-dom';
import enUS from 'date-fns/locale/en-US';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const JobsCalendarTab = ({ onStartJob }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { adminProfile } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalJobs, setModalJobs] = useState([]);

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

  const events = jobs.map(job => {
      const rawDateString = job.preferred_date ? job.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : '';
      const date = rawDateString ? new Date(rawDateString) : new Date();
      
      return {
          id: job.job_ref_id,
          title: job.job_ref_id, 
          start: date,
          end: new Date(date.getTime() + 60 * 60 * 1000), // Default 1 hour duration
          resource: job
      };
  });

  const handleSelectSlot = ({ start }) => {
     openDayModal(start);
  };

  const handleSelectEvent = (event) => {
     openDayModal(event.start);
  };

  const openDayModal = (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const dayJobs = jobs.filter(job => {
        const rawDateString = job.preferred_date ? job.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : '';
        const jobDate = rawDateString ? new Date(rawDateString) : null;
        return jobDate && jobDate >= startOfDay && jobDate <= endOfDay;
    });

    setSelectedDate(date);
    setModalJobs(dayJobs);
    setIsModalOpen(true);
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    const status = event.resource.status?.toLowerCase();
    let backgroundColor = '#3b82f6'; // blue default
    if (status === 'completed') backgroundColor = '#22c55e'; // green
    if (status === 'cancelled') backgroundColor = '#ef4444'; // red
    if (status === 'pending') backgroundColor = '#eab308'; // yellow

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem'
      }
    };
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
    <Card className="border-0 shadow-none rounded-none h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center text-2xl font-bold">
            <CalendarDays className="mr-3 h-7 w-7 text-primary" />
            Jobs Calendar
          </CardTitle>
          <CardDescription>View scheduled jobs by month. Click on a date to see details.</CardDescription>
        </div>
        
        {canCreateJob && (
          <Button asChild size="sm" className="hidden sm:flex">
             <Link to="/admin-dashboard/job/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Job
             </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-[600px] p-4">
         <style>{`
            .rbc-calendar { min-height: 600px; }
            .rbc-today { background-color: #f3f4f6; }
            .rbc-event { padding: 2px 5px; }
         `}</style>
         <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['month']} 
            selectable={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            popup={true} 
            messages={{
                showMore: (total) => `+${total} more`
            }}
         />

         <DayViewModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            date={selectedDate}
            jobs={jobs} 
            onStartJob={(job) => {
                setIsModalOpen(false);
                if (onStartJob) onStartJob(job);
            }}
         />
      </CardContent>
    </Card>
  );
};

export default JobsCalendarTab;