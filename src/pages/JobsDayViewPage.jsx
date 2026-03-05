import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, MapPin, User, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const JobsDayViewPage = () => {
  const { date } = useParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDayJobs = async () => {
        setLoading(true);
        try {
            // Fetch jobs for the day using UTC logic as dates are stored as UTC Face Value
            const startOfDay = new Date(date); // assumes UTC 00:00 for YYYY-MM-DD
            startOfDay.setUTCHours(0,0,0,0);
            
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23,59,59,999);

            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    job_ref_id,
                    created_at,
                    user_name,
                    user_email,
                    user_phone,
                    preferred_date,
                    status,
                    user_address,
                    assigned_employees_ids
                `)
                .gte('preferred_date', startOfDay.toISOString())
                .lte('preferred_date', endOfDay.toISOString())
                .order('preferred_date', { ascending: true });

            if (error) throw error;

            let jobsData = data || [];
            
            // Enrich with employee data
            if (jobsData.length > 0) {
                 const { data: employees } = await supabase.from('employees').select('id, full_name, email');
                 if (employees) {
                    const empMap = new Map(employees.map(e => [e.id, e]));
                    jobsData = jobsData.map(job => {
                        const empIds = job.assigned_employees_ids || [];
                        const empData = empIds.map(id => empMap.get(id)).filter(Boolean);
                        return { ...job, employees_data: empData };
                    });
                 }
            }

            setJobs(jobsData);

        } catch (err) {
            console.error("Error fetching day jobs:", err);
        } finally {
            setLoading(false);
        }
    };

    if (date) {
        fetchDayJobs();
    }
  }, [date]);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('daily-schedule-content');
    if (!element) return;

    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`schedule-${date}.pdf`);
    } catch (error) {
        console.error("PDF generation failed:", error);
    }
  };

  const formattedDate = date ? format(parseISO(date), 'MMMM d, yyyy') : 'Invalid Date';

  // Generate hourly slots from 08:00 to 18:00
  const hours = [];
  for (let i = 8; i <= 18; i++) {
      hours.push(i);
  }

  const getJobsForHour = (hour) => {
      return jobs.filter(job => {
          // Parse date strictly as local time by stripping timezone info
          // This ensures "10:00" stored value is treated as "10:00" displayed value regardless of user's timezone
          const cleanDateString = job.preferred_date ? job.preferred_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : '';
          const jobDate = new Date(cleanDateString);
          return jobDate.getHours() === hour;
      });
  };

  if (loading) {
      return <div className="p-8 text-center">Loading schedule...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/admin-dashboard/jobs-calendar">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Calendar
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold ml-2">Daily Schedule</h1>
                </div>
                <Button onClick={handleDownloadPDF} className="bg-primary text-white">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </div>

            <Card id="daily-schedule-content" className="bg-white shadow-lg print:shadow-none">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold text-gray-900">{formattedDate}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                                <Calendar className="h-4 w-4 mr-1"/> Full day overview
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-semibold text-gray-600 block">Total Jobs</span>
                            <span className="text-2xl font-bold text-primary">{jobs.length}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {jobs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No jobs scheduled for this date.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {hours.map(hour => {
                                const hourJobs = getJobsForHour(hour);
                                const timeLabel = `${hour.toString().padStart(2, '0')}:00`;

                                return (
                                    <div key={hour} className="flex flex-col sm:flex-row group hover:bg-gray-50/50 transition-colors">
                                        <div className="w-24 p-4 border-r border-gray-100 text-sm font-medium text-gray-500 flex-shrink-0 bg-gray-50/30">
                                            {timeLabel}
                                        </div>
                                        <div className="flex-1 p-4 min-h-[80px]">
                                            {hourJobs.length > 0 ? (
                                                <div className="space-y-4">
                                                    {hourJobs.map(job => {
                                                        const locationPhone = job.user_address?.phone;
                                                        
                                                        return (
                                                            <div key={job.job_ref_id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                                                <div className="flex flex-col md:flex-row justify-between gap-3 ml-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-bold text-gray-900">
                                                                                {job.job_ref_id}
                                                                            </span>
                                                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase tracking-wide">
                                                                                {job.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex items-center text-sm text-gray-600 mb-1">
                                                                            <User className="h-3 w-3 mr-1.5 text-gray-400" />
                                                                            {job.user_name || 'Guest'}
                                                                        </div>
                                                                        <div className="flex items-start text-sm text-gray-600">
                                                                            <MapPin className="h-3 w-3 mr-1.5 mt-0.5 text-gray-400 shrink-0" />
                                                                            <span className="break-words">
                                                                                {typeof job.user_address === 'object' && job.user_address 
                                                                                    ? `${job.user_address.street || ''}, ${job.user_address.city || ''}`
                                                                                    : (job.user_address || 'No address')
                                                                                }
                                                                                {locationPhone ? ` – ${locationPhone}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="md:text-right border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0 md:pl-4 md:border-l border-gray-100 min-w-[180px]">
                                                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                                                            Assigned To
                                                                        </span>
                                                                        <div className="space-y-1">
                                                                            {job.employees_data && job.employees_data.length > 0 ? (
                                                                                job.employees_data.map(emp => (
                                                                                    <div key={emp.id} className="text-sm text-gray-700 flex items-center md:justify-end">
                                                                                        <Users className="h-3 w-3 mr-1.5 text-gray-400 md:hidden" />
                                                                                        {emp.full_name || emp.email}
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <span className="text-sm text-amber-600 italic flex items-center md:justify-end">
                                                                                    Unassigned
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-gray-300 text-sm italic">
                                                    --
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default JobsDayViewPage;