import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Download, Users } from 'lucide-react';
import jsPDF from 'jspdf';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_HEIGHT = 96;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

const stripTimezone = (dateString) => dateString?.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') || '';

const parseFaceValueDate = (dateString) => {
  const cleanDateString = stripTimezone(dateString);
  return cleanDateString ? new Date(cleanDateString) : null;
};

const formatTime = (date) => format(date, 'hh:mm a');

const getAreaLabel = (address) => {
  if (!address) return 'No area';
  if (typeof address === 'object') return address.city || address.area || address.street || 'No area';
  return address;
};

const getFullAddress = (address) => {
  if (!address) return 'No address';
  if (typeof address === 'object') {
    return [address.street, address.city, address.zip].filter(Boolean).join(', ') || 'No address';
  }
  return address;
};

const getDurationHours = (job) => {
  const durationValue = job.hours_needed
    ?? job.duration_hours
    ?? job.estimated_hours
    ?? job.service_hours
    ?? job.duration
    ?? job.purchase?.hours_needed
    ?? job.purchase?.hours
    ?? 2;
  const parsedDuration = Number(durationValue);
  return Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 2;
};

const getJobTiming = (job) => {
  const start = parseFaceValueDate(job.preferred_date);
  if (!start) return null;
  const durationHours = getDurationHours(job);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return { start, end, durationHours };
};

const getStatusStyles = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('complete')) {
    return {
      card: 'border-l-slate-400 bg-slate-50 text-slate-700',
      badge: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }
  if (normalizedStatus.includes('progress') || normalizedStatus.includes('active')) {
    return {
      card: 'border-l-emerald-500 bg-emerald-50 text-emerald-900',
      badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    };
  }
  if (normalizedStatus.includes('cancel')) {
    return {
      card: 'border-l-red-500 bg-red-50 text-red-900',
      badge: 'border-red-200 bg-red-100 text-red-700',
    };
  }
  if (normalizedStatus.includes('pending')) {
    return {
      card: 'border-l-amber-500 bg-amber-50 text-amber-900',
      badge: 'border-amber-200 bg-amber-100 text-amber-700',
    };
  }
  return {
    card: 'border-l-sky-500 bg-sky-50 text-sky-900',
    badge: 'border-sky-200 bg-sky-100 text-sky-700',
  };
};

const getPdfStatusColors = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('complete')) {
    return { fill: [248, 250, 252], stroke: [148, 163, 184], text: [51, 65, 85] };
  }
  if (normalizedStatus.includes('progress') || normalizedStatus.includes('active')) {
    return { fill: [236, 253, 245], stroke: [16, 185, 129], text: [6, 78, 59] };
  }
  if (normalizedStatus.includes('cancel')) {
    return { fill: [254, 242, 242], stroke: [239, 68, 68], text: [127, 29, 29] };
  }
  if (normalizedStatus.includes('pending')) {
    return { fill: [255, 251, 235], stroke: [245, 158, 11], text: [120, 53, 15] };
  }
  return { fill: [240, 249, 255], stroke: [14, 165, 233], text: [12, 74, 110] };
};

const drawFittedText = (pdf, text, x, y, maxWidth, maxLines = 1, lineHeight = 4) => {
  const safeText = String(text || '').trim();
  if (!safeText) return;

  const lines = pdf.splitTextToSize(safeText, maxWidth).slice(0, maxLines);
  if (lines.length === maxLines && pdf.getTextWidth(lines[lines.length - 1]) > maxWidth) {
    let lastLine = lines[lines.length - 1];
    while (lastLine.length > 0 && pdf.getTextWidth(`${lastLine}...`) > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${lastLine}...`;
  }

  lines.forEach((line, index) => {
    pdf.text(line, x, y + index * lineHeight);
  });
};

const isPartTimeEmployee = (employee) => (
  employee?.is_part_timer === true || String(employee?.position || '').toLowerCase().includes('part')
);

const buildSchedulerJobs = (jobs) => {
  const timedJobs = jobs
    .map((job) => {
      const timing = getJobTiming(job);
      if (!timing) return null;

      const startMinutes = Math.max(0, (timing.start.getHours() - DAY_START_HOUR) * 60 + timing.start.getMinutes());
      const endMinutes = Math.min((DAY_END_HOUR - DAY_START_HOUR) * 60, (timing.end.getHours() - DAY_START_HOUR) * 60 + timing.end.getMinutes());
      const safeEndMinutes = Math.max(startMinutes + 30, endMinutes);

      return {
        ...job,
        ...timing,
        startMinutes,
        endMinutes: safeEndMinutes,
        trackIndex: 0,
        trackCount: 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -1;

  timedJobs.forEach((job) => {
    if (currentCluster.length === 0 || job.startMinutes < currentClusterEnd) {
      currentCluster.push(job);
      currentClusterEnd = Math.max(currentClusterEnd, job.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [job];
      currentClusterEnd = job.endMinutes;
    }
  });

  if (currentCluster.length > 0) clusters.push(currentCluster);

  clusters.forEach((cluster) => {
    const tracks = [];
    cluster.forEach((job) => {
      const availableTrackIndex = tracks.findIndex((trackEnd) => trackEnd <= job.startMinutes);
      const nextTrackIndex = availableTrackIndex === -1 ? tracks.length : availableTrackIndex;
      tracks[nextTrackIndex] = job.endMinutes;
      job.trackIndex = nextTrackIndex;
    });

    const trackCount = Math.max(1, tracks.length);
    cluster.forEach((job) => {
      job.trackCount = trackCount;
    });
  });

  return timedJobs;
};

const JobSlotCard = ({ job }) => {
  const statusStyles = getStatusStyles(job.status);
  const cleanerCount = job.assigned_employees_ids?.length || job.employees_data?.length || 0;
  const area = getAreaLabel(job.user_address);

  return (
    <Link
      to={`/admin-dashboard/job/${job.job_ref_id}`}
      className={`absolute overflow-hidden rounded-xl border border-slate-200 border-l-4 p-3 text-xs shadow-sm transition hover:z-20 hover:shadow-md ${statusStyles.card}`}
      style={{
        top: job.startMinutes * MINUTE_HEIGHT,
        height: Math.max(68, (job.endMinutes - job.startMinutes) * MINUTE_HEIGHT - 6),
        left: `calc(${(job.trackIndex / job.trackCount) * 100}% + 4px)`,
        width: `calc(${100 / job.trackCount}% - 8px)`,
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`h-5 rounded-md px-1.5 text-[10px] font-semibold ${statusStyles.badge}`}>
          {formatTime(job.start)} - {formatTime(job.end)}
        </Badge>
        <Badge variant="outline" className={`h-5 rounded-md px-1.5 text-[10px] capitalize ${statusStyles.badge}`}>
          {job.status || 'Scheduled'}
        </Badge>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-bold">{job.user_name || 'Guest'} - {area}</p>
        <p className="mt-1 truncate text-[11px] opacity-80">{getFullAddress(job.user_address)}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-80">
        <span><Users className="mr-1 inline h-3 w-3" />{cleanerCount || 'No'} Cleaner{cleanerCount === 1 ? '' : 's'}</span>
        <span><Clock className="mr-1 inline h-3 w-3" />{Number(job.durationHours).toFixed(job.durationHours % 1 ? 1 : 0)} Hours</span>
      </div>
      {job.employees_data?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.employees_data.map((employee) => {
            const isPartTimer = isPartTimeEmployee(employee);
            return (
              <span
                key={employee.id}
                className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  isPartTimer
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
                title={`${employee.full_name || employee.email || 'Employee'}${isPartTimer ? ' - Part Timer' : ' - Regular'}`}
              >
                {employee.full_name || employee.email}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
};

const JobsDayViewPage = () => {
  const { date } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedDate = useMemo(() => {
    try {
      return date ? parseISO(date) : new Date();
    } catch (error) {
      return new Date();
    }
  }, [date]);

  const dateParam = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchDayJobs = async () => {
      setLoading(true);
      try {
        const startOfDay = new Date(dateParam);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(dateParam);
        endOfDay.setUTCHours(23, 59, 59, 999);

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
            assigned_employees_ids,
            hours_needed,
            purchase:purchases(hours)
          `)
          .gte('preferred_date', startOfDay.toISOString())
          .lte('preferred_date', endOfDay.toISOString())
          .order('preferred_date', { ascending: true });

        if (error) throw error;

        let jobsData = data || [];

        if (jobsData.length > 0) {
          const { data: employees } = await supabase.from('employees').select('id, full_name, email, position, is_part_timer');
          if (employees) {
            const empMap = new Map(employees.map((employee) => [employee.id, employee]));
            jobsData = jobsData.map((job) => {
              const empIds = job.assigned_employees_ids || [];
              const empData = empIds.map((id) => empMap.get(id)).filter(Boolean);
              return { ...job, employees_data: empData };
            });
          }
        }

        setJobs(jobsData);
      } catch (err) {
        console.error('Error fetching day jobs:', err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDayJobs();
  }, [dateParam]);

  const schedulerJobs = useMemo(() => buildSchedulerJobs(jobs), [jobs]);
  const maxTracks = useMemo(() => Math.max(1, ...schedulerJobs.map((job) => job.trackCount)), [schedulerJobs]);
  const totalGridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;
  const hours = useMemo(() => {
    const hourRows = [];
    for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour += 1) {
      hourRows.push(hour);
    }
    return hourRows;
  }, []);

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const titleTop = 12;
      const headerTop = 32;
      const gridTop = 45;
      const gridBottom = pageHeight - 14;
      const timeColumnWidth = 20;
      const gridLeft = margin + timeColumnWidth;
      const gridWidth = pageWidth - margin * 2 - timeColumnWidth;
      const tracksPerPage = Math.min(4, Math.max(1, maxTracks));
      const trackChunks = Array.from(
        { length: Math.ceil(maxTracks / tracksPerPage) || 1 },
        (_, index) => ({
          start: index * tracksPerPage,
          end: Math.min(maxTracks, (index + 1) * tracksPerPage),
        }),
      );
      const timeSegments = [
        { label: 'Morning', startHour: DAY_START_HOUR, endHour: 14 },
        { label: 'Afternoon', startHour: 14, endHour: DAY_END_HOUR },
      ];
      const totalPdfPages = trackChunks.length * timeSegments.length;

      const drawPageHeader = (pageIndex, chunk, segment) => {
        const visibleHours = segment.endHour - segment.startHour;
        const hourHeight = (gridBottom - gridTop) / visibleHours;

        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('ReadyNest Daily Schedule', margin, titleTop);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(15, 23, 42);
        pdf.text(format(selectedDate, 'EEEE, MMMM d, yyyy'), margin, titleTop + 9);

        const summaryText = `${segment.label} - Teams ${chunk.start + 1}-${chunk.end}`;
        const summaryWidth = pdf.getTextWidth(summaryText) + 10;
        pdf.setFillColor(37, 99, 235);
        pdf.roundedRect(pageWidth - margin - summaryWidth, titleTop + 2, summaryWidth, 8, 4, 4, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(summaryText, pageWidth - margin - 5, titleTop + 7.5, { align: 'right' });

        if (totalPdfPages > 1) {
          pdf.setTextColor(100, 116, 139);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.text(
            `${schedulerJobs.length} job${schedulerJobs.length === 1 ? '' : 's'} - Page ${pageIndex + 1} of ${totalPdfPages}`,
            pageWidth - margin,
            titleTop + 16,
            { align: 'right' },
          );
        }

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, headerTop, pageWidth - margin * 2, gridBottom - headerTop, 4, 4, 'FD');

        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, headerTop, pageWidth - margin * 2, gridTop - headerTop, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, gridTop, pageWidth - margin, gridTop);
        pdf.line(gridLeft, headerTop, gridLeft, gridBottom);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text('TIME', margin + 4, headerTop + 8);

        const trackWidth = gridWidth / (chunk.end - chunk.start || 1);
        for (let trackIndex = chunk.start; trackIndex < chunk.end; trackIndex += 1) {
          const x = gridLeft + (trackIndex - chunk.start) * trackWidth;
          pdf.line(x, headerTop, x, gridBottom);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`TEAM ${trackIndex + 1}`, x + 3, headerTop + 8);
        }
        pdf.line(pageWidth - margin, headerTop, pageWidth - margin, gridBottom);

        for (let hour = segment.startHour; hour <= segment.endHour; hour += 1) {
          const y = gridTop + (hour - segment.startHour) * hourHeight;
          pdf.setDrawColor(226, 232, 240);
          pdf.line(margin, y, pageWidth - margin, y);

          if (hour < segment.endHour) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(100, 116, 139);
            pdf.text(format(new Date(2020, 0, 1, hour), 'h a'), margin + 4, y + 5);
          }
        }

        return {
          trackWidth,
          hourHeight,
          segmentStartMinutes: (segment.startHour - DAY_START_HOUR) * 60,
          segmentEndMinutes: (segment.endHour - DAY_START_HOUR) * 60,
        };
      };

      let pageIndex = 0;
      trackChunks.forEach((chunk) => {
        timeSegments.forEach((segment) => {
          if (pageIndex > 0) pdf.addPage();
          const {
            trackWidth,
            hourHeight,
            segmentStartMinutes,
            segmentEndMinutes,
          } = drawPageHeader(pageIndex, chunk, segment);

          schedulerJobs
            .filter((job) => (
              job.trackIndex >= chunk.start
              && job.trackIndex < chunk.end
              && job.endMinutes > segmentStartMinutes
              && job.startMinutes < segmentEndMinutes
            ))
            .forEach((job) => {
            const colors = getPdfStatusColors(job.status);
            const localTrackIndex = job.trackIndex - chunk.start;
            const visibleStartMinutes = Math.max(job.startMinutes, segmentStartMinutes);
            const visibleEndMinutes = Math.min(job.endMinutes, segmentEndMinutes);
            const x = gridLeft + localTrackIndex * trackWidth + 1.5;
            const y = gridTop + ((visibleStartMinutes - segmentStartMinutes) / 60) * hourHeight + 1.2;
            const height = Math.max(17, ((visibleEndMinutes - visibleStartMinutes) / 60) * hourHeight - 2.4);
            const width = Math.max(24, trackWidth - 3);
            const cleanerCount = job.assigned_employees_ids?.length || job.employees_data?.length || 0;
            const employees = job.employees_data || [];
            const employeeNames = employees.map((employee) => employee.full_name || employee.email).filter(Boolean);
            const visibleEmployeeNames = employeeNames.slice(0, 3).join(', ');
            const remainingEmployeeCount = Math.max(0, employeeNames.length - 3);
            const employeeLabel = visibleEmployeeNames
              ? `${visibleEmployeeNames}${remainingEmployeeCount ? ` +${remainingEmployeeCount}` : ''}`
              : 'Unassigned';

            pdf.setFillColor(226, 232, 240);
            pdf.roundedRect(x + 0.7, y + 0.8, width, height, 2, 2, 'F');
            pdf.setFillColor(...colors.fill);
            pdf.setDrawColor(...colors.stroke);
            pdf.roundedRect(x, y, width, height, 2, 2, 'FD');

            pdf.setFillColor(...colors.stroke);
            pdf.rect(x, y, 1.8, height, 'F');

            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(...colors.stroke);
            pdf.roundedRect(x + 3.2, y + 2, Math.min(35, width - 7), 5.6, 1.5, 1.5, 'FD');
            pdf.setTextColor(...colors.text);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5.8);
            drawFittedText(pdf, `${formatTime(job.start)} - ${formatTime(job.end)}`, x + 5, y + 5.9, Math.min(30, width - 11));

            pdf.setFontSize(8);
            drawFittedText(pdf, `${job.user_name || 'Guest'} - ${getAreaLabel(job.user_address)}`, x + 3.2, y + 12, width - 6);

            if (height >= 18) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(6);
              drawFittedText(
                pdf,
                `${cleanerCount || 'No'} cleaner${cleanerCount === 1 ? '' : 's'} - ${Number(job.durationHours).toFixed(job.durationHours % 1 ? 1 : 0)} hours`,
                x + 3.2,
                y + 16,
                width - 6,
              );
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5.6);
            const employeeY = height >= 25 ? y + 21 : y + height - 2.2;
            const employeeFill = employees.some(isPartTimeEmployee) ? [255, 237, 213] : [220, 252, 231];
            const employeeText = employees.some(isPartTimeEmployee) ? [194, 65, 12] : [4, 120, 87];
            pdf.setFillColor(...employeeFill);
            pdf.roundedRect(x + 3.2, Math.max(y + 8.2, employeeY - 3.8), width - 6.4, 4.8, 1.6, 1.6, 'F');
            pdf.setTextColor(...employeeText);
            drawFittedText(pdf, employeeLabel, x + 5, Math.max(y + 11.6, employeeY), width - 10);

            if (height >= 31 && job.status) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(5.5);
              pdf.setTextColor(...colors.text);
              drawFittedText(pdf, String(job.status), x + 3.2, y + height - 3, width - 6);
            }
          });

          if (schedulerJobs.length === 0) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139);
            pdf.text('No jobs scheduled for this date.', pageWidth / 2, gridTop + 35, { align: 'center' });
          }

          pageIndex += 1;
        });
      });

      pdf.save(`schedule-${dateParam}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  const moveDate = (days) => {
    navigate(`/admin-dashboard/jobs/day/${format(addDays(selectedDate, days), 'yyyy-MM-dd')}`);
  };

  const goToday = () => {
    navigate(`/admin-dashboard/jobs/day/${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleSlotClick = (hour) => {
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hour, 0, 0, 0);
    navigate(`/admin-dashboard/job/create?preferred_date=${encodeURIComponent(slotDate.toISOString())}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading schedule...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link to="/admin-dashboard/jobs-calendar">
                <ArrowLeft className="mr-2 h-4 w-4" /> Calendar
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Time-Slot Scheduler</h1>
              <p className="text-lg font-bold text-slate-800 md:text-xl">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => moveDate(-1)} className="rounded-xl">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} className="rounded-xl">
              <CalendarDays className="mr-2 h-4 w-4" /> Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => moveDate(1)} className="rounded-xl">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <Card id="daily-schedule-content" className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <div className="sticky top-0 z-30 grid grid-cols-[76px_minmax(720px,1fr)] border-b border-slate-100 bg-white">
            <div className="border-r border-slate-100 p-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Time</div>
            <div className="relative">
              <div className="grid p-3" style={{ gridTemplateColumns: `repeat(${maxTracks}, minmax(220px, 1fr))` }}>
                {Array.from({ length: maxTracks }).map((_, index) => (
                  <div key={index} className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Team {index + 1}
                  </div>
                ))}
              </div>
              {maxTracks > 2 && (
                <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border border-blue-100 bg-white/95 px-2 py-1 text-[10px] font-semibold text-blue-600 shadow-sm md:hidden">
                  More
                  <ChevronRight className="h-3.5 w-3.5 animate-pulse" />
                </div>
              )}
            </div>
          </div>
          <CardContent className="p-0">
            {schedulerJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No jobs scheduled for this date.</div>
            ) : (
              <div className="max-h-[calc(100vh-220px)] overflow-auto">
                <div className="grid min-w-[840px] grid-cols-[76px_minmax(720px,1fr)]">
                  <div className="sticky left-0 z-20 border-r border-slate-100 bg-white">
                    {hours.slice(0, -1).map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleSlotClick(hour)}
                        className="flex w-full items-start justify-end border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        style={{ height: HOUR_HEIGHT }}
                      >
                        {format(new Date(2020, 0, 1, hour), 'h a')}
                      </button>
                    ))}
                  </div>

                  <div className="relative" style={{ height: totalGridHeight }}>
                    {hours.slice(0, -1).map((hour, index) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleSlotClick(hour)}
                        className="absolute left-0 right-0 border-b border-slate-100 text-left transition hover:bg-blue-50/40"
                        style={{ top: index * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        aria-label={`Create job at ${format(new Date(2020, 0, 1, hour), 'h a')}`}
                      />
                    ))}
                    <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${maxTracks}, minmax(220px, 1fr))` }}>
                      {Array.from({ length: maxTracks }).map((_, index) => (
                        <div key={index} className="border-r border-slate-100 last:border-r-0" />
                      ))}
                    </div>
                    <div className="absolute inset-0">
                      {schedulerJobs.map((job) => (
                        <JobSlotCard key={job.job_ref_id} job={job} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ['Scheduled', 'bg-sky-100 text-sky-700 border-sky-200'],
            ['In Progress', 'bg-emerald-100 text-emerald-700 border-emerald-200'],
            ['Pending', 'bg-amber-100 text-amber-700 border-amber-200'],
            ['Completed', 'bg-slate-100 text-slate-700 border-slate-200'],
          ].map(([label, className]) => (
            <div key={label} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${className}`}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobsDayViewPage;
