import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  createPartTimeApplication,
  getActivePartTimePostings,
  getPartTimeApplicationsByEmployee,
  verifyPartTimerByMobile,
} from '@/lib/storage/jobStorage';
import { Briefcase, CalendarDays, Clock, MessageCircle, MapPin, Phone, Users } from 'lucide-react';
import { format } from 'date-fns';

const PART_TIME_SESSION_STORAGE_KEY = 'readynest_part_time_verified_session';
const READYNEST_WHATSAPP_NUMBER = '97333215180';

const formatDateSafe = (dateString) => {
  if (!dateString) return 'Flexible schedule';

  try {
    const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
    const date = new Date(cleanDateString);
    if (Number.isNaN(date.getTime())) return 'Flexible schedule';
    return format(date, 'MMM d, yyyy, h:mm a');
  } catch (error) {
    console.error('Error formatting part-time posting date:', error);
    return 'Flexible schedule';
  }
};

const normalizePhone = (phone) => phone.replace(/[^\d+]/g, '').trim();

const getApplicationStatusClassName = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'accepted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'declined':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
};

const buildPartTimerWhatsAppLink = (phone) => {
  const message = `Hi ReadyNest, I would like to apply as a part-timer. My mobile number is ${phone || ''}.`;
  return `https://wa.me/${READYNEST_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const getStoredPartTimeSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const storedSession = window.localStorage.getItem(PART_TIME_SESSION_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch (error) {
    console.warn('Unable to parse part-time session:', error);
    window.localStorage.removeItem(PART_TIME_SESSION_STORAGE_KEY);
    return null;
  }
};

const PartTimeJobCard = ({ posting, onApply, applied }) => {
  const location = posting.user_address?.city || posting.user_address?.street || 'ReadyNest location';
  const hourlyPay = Number(posting.hourly_pay || 0).toFixed(3);
  const hoursNeeded = Number(posting.hours_needed || 0);

  return (
    <Card className="h-full border-slate-200 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-slate-950">{posting.title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Ref: {posting.job_ref_id}</p>
          </div>
          <Badge className="bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-600">
            {hourlyPay} BD / hr
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            <Clock className="mr-1 h-3 w-3" /> {Number.isInteger(hoursNeeded) ? hoursNeeded : hoursNeeded.toFixed(1)} Hours needed
          </Badge>
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
            <Users className="mr-1 h-3 w-3" /> {posting.slots_available} openings available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>{formatDateSafe(posting.preferred_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{location}</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={posting.transport_included
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'}
        >
          {posting.transport_included ? 'Transport Included' : 'Transport Not Included'}
        </Badge>
        <Button className="w-full" onClick={() => onApply(posting)} disabled={applied}>
          {applied ? 'Interest Logged' : 'Apply for Job'}
        </Button>
      </CardContent>
    </Card>
  );
};

const AppliedJobCard = ({ application }) => {
  const location = application.user_address?.city || application.user_address?.street || 'ReadyNest location';
  const hourlyPay = Number(application.hourly_pay || 0).toFixed(3);
  const hoursNeeded = Number(application.hours_needed || 0);

  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-slate-950">{application.title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Ref: {application.job_ref_id}</p>
          </div>
          <Badge variant="outline" className={`capitalize ${getApplicationStatusClassName(application.status)}`}>
            {application.status || 'interested'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-600">
            {hourlyPay} BD / hr
          </Badge>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            <Clock className="mr-1 h-3 w-3" /> {Number.isInteger(hoursNeeded) ? hoursNeeded : hoursNeeded.toFixed(1)} Hours needed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span>Applied {formatDateSafe(application.applied_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span>{formatDateSafe(application.preferred_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span>{location}</span>
        </div>
        <Badge
          variant="outline"
          className={application.transport_included
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'}
        >
          {application.transport_included ? 'Transport Included' : 'Transport Not Included'}
        </Badge>
      </CardContent>
    </Card>
  );
};

const PartTimeCareersPage = () => {
  const { toast } = useToast();
  const [phoneInput, setPhoneInput] = useState('');
  const [partTimerSession, setPartTimerSession] = useState(getStoredPartTimeSession);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [appliedJobRefs, setAppliedJobRefs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [errorMessage, setErrorMessage] = useState('');
  const [whatsAppPromptOpen, setWhatsAppPromptOpen] = useState(false);
  const [whatsAppPromptPhone, setWhatsAppPromptPhone] = useState('');

  const hasAccess = Boolean(partTimerSession?.id);

  const fetchApplications = useCallback(async () => {
    if (!partTimerSession?.id) return;

    setApplicationsLoading(true);
    try {
      const employeeApplications = await getPartTimeApplicationsByEmployee(partTimerSession.id);
      setApplications(employeeApplications);
      setAppliedJobRefs(employeeApplications.map((application) => application.job_ref_id));
    } catch (error) {
      console.error('Error loading part-time applications:', error);
      toast({
        title: 'Unable to Load Applied Jobs',
        description: error.message || 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setApplicationsLoading(false);
    }
  }, [partTimerSession?.id, toast]);

  useEffect(() => {
    if (!hasAccess) return;

    const fetchPostings = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const activePostings = await getActivePartTimePostings();
        setPostings(activePostings);
      } catch (error) {
        console.error('Error loading part-time postings:', error);
        setErrorMessage('Could not load part-time positions. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    };

    fetchPostings();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    fetchApplications();
  }, [fetchApplications, hasAccess]);

  const handlePhoneSubmit = async (event) => {
    event.preventDefault();
    const normalizedPhone = normalizePhone(phoneInput);

    if (normalizedPhone.length < 8) {
      toast({
        title: 'Phone Required',
        description: 'Please enter a registered phone number to view part-time jobs.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      const employee = await verifyPartTimerByMobile(normalizedPhone);
      const session = {
        id: employee.id,
        full_name: employee.full_name,
        mobile: employee.mobile,
        position: employee.employee_position || employee.position,
        accepted_part_time_jobs_count: employee.accepted_part_time_jobs_count || 0,
        verified_at: new Date().toISOString(),
      };

      window.localStorage.setItem(PART_TIME_SESSION_STORAGE_KEY, JSON.stringify(session));
      setPartTimerSession(session);
      setPhoneInput('');
    } catch (error) {
      setWhatsAppPromptPhone(normalizedPhone);
      setWhatsAppPromptOpen(true);
      toast({
        title: 'Unable to Verify',
        description: error.message || 'Mobile number not registered as a part-timer. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleApply = async (posting) => {
    if (!partTimerSession?.id) {
      toast({
        title: 'Verification Required',
        description: 'Please verify your registered mobile number before applying.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createPartTimeApplication(posting.job_ref_id, partTimerSession.id);
      console.log('Part-time job application:', {
        job_ref_id: posting.job_ref_id,
        employee_id: partTimerSession.id,
        alreadyApplied: result.alreadyApplied,
      });
      setAppliedJobRefs((currentRefs) => [...new Set([...currentRefs, posting.job_ref_id])]);
      setPartTimerSession((currentSession) => {
        if (!currentSession) return currentSession;
        const nextSession = {
          ...currentSession,
          accepted_part_time_jobs_count: result.acceptedJobsCount ?? currentSession.accepted_part_time_jobs_count,
        };
        window.localStorage.setItem(PART_TIME_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        return nextSession;
      });
      setPostings((currentPostings) =>
        currentPostings
          .map((currentPosting) =>
            currentPosting.job_ref_id === posting.job_ref_id
              ? { ...currentPosting, slots_available: result.slotsAvailable ?? currentPosting.slots_available }
              : currentPosting
          )
          .filter((currentPosting) => Number(currentPosting.slots_available || 0) > 0)
      );
      await fetchApplications();
      setActiveTab('applied');
      toast({
        title: result.alreadyApplied ? 'Already Logged' : 'Interest Logged',
        description: result.alreadyApplied
          ? 'You have already applied for this job.'
          : 'Your interest has been sent to ReadyNest.',
      });
    } catch (error) {
      toast({
        title: 'Unable to Apply',
        description: error.message || 'Please try again shortly.',
        variant: 'destructive',
      });
    }
  };

  const activePostingsCount = useMemo(() => postings.length, [postings]);
  const whatsAppLink = useMemo(
    () => buildPartTimerWhatsAppLink(whatsAppPromptPhone || phoneInput),
    [phoneInput, whatsAppPromptPhone]
  );

  if (!hasAccess) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Part-Time Jobs</h1>
              <p className="text-sm text-slate-500">Enter your registered mobile number to continue.</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handlePhoneSubmit}>
            <div className="space-y-2">
              <Label htmlFor="part-time-phone">Registered Mobile Number</Label>
              <Input
                id="part-time-phone"
                type="tel"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                placeholder="+973..."
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? 'Verifying...' : 'View Jobs'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-500">
            Mobile number not registered as a part-timer? Message us on WhatsApp to apply.
          </p>
        </div>
        <Dialog open={whatsAppPromptOpen} onOpenChange={setWhatsAppPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply as a Part-Timer</DialogTitle>
              <DialogDescription>
                This mobile number is not registered as a ReadyNest part-timer yet. Message our team on WhatsApp and we will help you apply.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setWhatsAppPromptOpen(false)}>
                Close
              </Button>
              <Button asChild>
                <a href={whatsAppLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Message on WhatsApp
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <section className="border-b bg-white px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                <Briefcase className="h-4 w-4" /> Looking for Part-Timers
              </div>
              <h1 className="text-3xl font-bold text-slate-950 md:text-4xl">ReadyNest Part-Time Job Board</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Browse currently available ReadyNest part-time service jobs.
              </p>
            </div>
            <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>{activePostingsCount} active position{activePostingsCount === 1 ? '' : 's'}</div>
              <div className="mt-1 text-xs">
                {partTimerSession.full_name || partTimerSession.mobile} - Accepted {partTimerSession.accepted_part_time_jobs_count || 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="applied">Applied</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {loading ? (
              <div className="rounded-lg border bg-white p-8 text-center text-slate-500">Loading part-time positions...</div>
            ) : errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-700">{errorMessage}</div>
            ) : postings.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
                No part-time positions currently available.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {postings.map((posting) => (
                  <PartTimeJobCard
                    key={posting.job_ref_id}
                    posting={posting}
                    onApply={handleApply}
                    applied={appliedJobRefs.includes(posting.job_ref_id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applied">
            {applicationsLoading ? (
              <div className="rounded-lg border bg-white p-8 text-center text-slate-500">Loading applied jobs...</div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
                You have not applied for any part-time jobs yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {applications.map((application) => (
                  <AppliedJobCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default PartTimeCareersPage;
