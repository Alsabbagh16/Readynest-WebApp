import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, User, Users, PlayCircle, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// Helper to format date treating it as "Face Value"
// strips timezone info (Z or +00:00) so "2025-05-10T14:00:00Z" becomes "2025-05-10T14:00:00"
// which new Date() interprets as local time, preserving the 14:00 hour.
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

const DayViewModal = ({ isOpen, onClose, date, jobs, onStartJob }) => {
  const { adminProfile } = useAdminAuth();

  if (!isOpen || !date) return null;

  // Filter jobs for the specific date.
  // We strip the timezone from the job date before comparing to ensure we match the "Face Value" date
  // with the selected calendar date.
  const dayJobs = jobs.filter(job => {
    if (!job.preferred_date) return false;
    const cleanDateString = job.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
    const jobDate = new Date(cleanDateString);
    return jobDate.toDateString() === date.toDateString();
  });

  // Sort by time
  dayJobs.sort((a, b) => {
    const dateA = new Date(a.preferred_date ? a.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : 0);
    const dateB = new Date(b.preferred_date ? b.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : 0);
    return dateA.getTime() - dateB.getTime();
  });

  const formattedDate = format(date, 'MMMM d, yyyy');

  const isStaff = adminProfile?.role === 'staff';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold">
            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
            Schedule for {formattedDate}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {dayJobs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
              No jobs scheduled for this day.
            </div>
          ) : (
            dayJobs.map((job) => (
              <div 
                key={job.job_ref_id} 
                className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                        {/* Use formatDateSafe to prevent timezone shifts */}
                        {formatDateSafe(job.preferred_date, 'HH:mm')}
                    </Badge>
                    <Link 
                      to={`/admin-dashboard/job/${job.job_ref_id}`} 
                      className="text-primary font-bold hover:underline flex items-center"
                    >
                      {job.job_ref_id}
                    </Link>
                    <Badge variant="secondary" className="capitalize ml-2 text-xs">
                        {job.status}
                    </Badge>
                    
                    {/* Start Job Button for Staff */}
                    {isStaff && (job.status === 'Scheduled' || job.status === 'Pending' || job.status === 'In Progress') && (
                      <Button
                        size="sm"
                        variant={job.status === 'In Progress' ? "outline" : "default"}
                        className={`h-6 text-[10px] px-2 ml-2 ${job.status === 'In Progress' ? 'border-blue-200 text-blue-600 bg-blue-50 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => onStartJob && onStartJob(job)}
                      >
                         {job.status === 'In Progress' ? <Clock className="h-3 w-3 mr-1" /> : <PlayCircle className="h-3 w-3 mr-1" />}
                         {job.status === 'In Progress' ? 'Resume' : 'Start Job'}
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {job.user_name || 'Guest User'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                   <div className="flex items-start">
                     <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5 shrink-0" />
                     <span className="text-gray-700">
                        {typeof job.user_address === 'object' && job.user_address 
                            ? `${job.user_address.street || ''}, ${job.user_address.city || ''}`
                            : (job.user_address || 'No address provided')
                        }
                     </span>
                   </div>
                   <div className="flex items-start">
                     <Users className="h-4 w-4 mr-2 text-muted-foreground mt-0.5 shrink-0" />
                     <span className="text-gray-700">
                        {job.employees_data && job.employees_data.length > 0 
                            ? job.employees_data.map(e => e.full_name || e.email).join(', ')
                            : <span className="text-amber-600 italic">No employees assigned</span>
                        }
                     </span>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild className="w-full sm:w-auto">
             <Link to={`/admin-dashboard/jobs/day/${format(date, 'yyyy-MM-dd')}`}>
                View Full Page
             </Link>
          </Button>
          <Button onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayViewModal;