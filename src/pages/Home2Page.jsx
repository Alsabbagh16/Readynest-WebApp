import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Home,
  Wrench,
  Sparkles,
  MapPin,
  Clock,
  CalendarDays,
  ChevronRight,
  RotateCw,
  UserCircle,
  Loader2,
  Mail,
  LogOut
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useBooking } from "@/contexts/BookingContext";
import { getUserJobs } from "@/lib/storage/jobStorage";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PromotionalBanner from "@/components/PromotionalBanner";
import { usePurchaseNotifications } from "@/hooks/usePurchaseNotifications";
import CompactProductCards from "@/components/CompactProductCards";

const services = [
  {
    id: 1,
    name: "Home Cleaning",
    icon: <Home className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600",
    active: true,
    route: "/hourlybooking"
  },
  {
    id: 2,
    name: "Handyman",
    icon: <Wrench className="h-6 w-6" />,
    color: "bg-gray-100 text-gray-400",
    active: false
  },
  {
    id: 3,
    name: "Deep Clean",
    icon: <Sparkles className="h-6 w-6" />,
    color: "bg-gray-100 text-gray-400",
    active: false
  },
  {
    id: 4,
    name: "Move In/Out",
    icon: <CalendarDays className="h-6 w-6" />,
    color: "bg-gray-100 text-gray-400",
    active: false
  },
];

const Home2Page = () => {
  const { user, profile, loading: authLoading, addresses, logout } = useAuth();
  const { setBookingData } = useBooking();
  const { hasNewPurchases } = usePurchaseNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isBookingAgain, setIsBookingAgain] = useState(false);

  // Derived user data
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || "Guest";

  const userInitial = displayName.charAt(0).toUpperCase();
  const userType = profile?.user_type || "Client";
  const isBusinessUser = profile?.user_type === 'business' || profile?.user_type === 'host';

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    if (user) {
      setLoadingJobs(true);
      try {
        // Fetch jobs for client
        const fetchedJobs = await getUserJobs(user.id);
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        toast({ title: "Error", description: "Failed to load jobs.", variant: "destructive" });
      } finally {
        setLoadingJobs(false);
      }
    } else {
      setJobs([]);
      setLoadingJobs(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 text-[10px] px-2 py-0 h-5">Completed</Badge>;
      case 'in progress':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse text-[10px] px-2 py-0 h-5">In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] px-2 py-0 h-5">Scheduled</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 text-[10px] px-2 py-0 h-5">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">{status}</Badge>;
    }
  };


  const handleBookAgain = async (job) => {
    setIsBookingAgain(true);
    try {
      const { data: purchaseData, error } = await supabase
        .from('purchases')
        .select('raw_selections, selected_addons')
        .eq('purchase_ref_id', job.purchase_ref_id)
        .single();

      if (error || !purchaseData) {
        throw new Error("Could not retrieve job details.");
      }

      const { raw_selections, selected_addons } = purchaseData;

      if (!raw_selections || !raw_selections.propertyType || !raw_selections.homeSize || !raw_selections.cleaningType) {
        throw new Error("Incomplete job data for re-booking.");
      }

      let matchedAddressId = null;
      if (addresses && addresses.length > 0 && job.user_address) {
        const jobAddr = job.user_address;
        const matched = addresses.find(a =>
          (a.street === jobAddr.street && a.city === jobAddr.city) ||
          (a.label === jobAddr.label)
        );
        if (matched) matchedAddressId = matched.id;
      }

      setBookingData({
        selections: {
          propertyType: raw_selections.propertyType,
          homeSize: raw_selections.homeSize,
          cleaningType: raw_selections.cleaningType,
          planId: raw_selections.planId || null
        },
        prefilled: {
          addons: selected_addons ? selected_addons.map(a => a.id) : [],
          addressId: matchedAddressId
        },
        resetDates: true
      });

      toast({
        title: "Re-booking initiated",
        description: "We've copied your previous service details. Please choose a new date.",
      });
      navigate('/hourlybooking');

    } catch (error) {
      console.error("Book Again Error:", error);
      toast({
        title: "Error",
        description: "Could not load job details for re-booking. Please try starting a new booking.",
        variant: "destructive",
      });
    } finally {
      setIsBookingAgain(false);
    }
  };

  const handleDetailsClick = (jobId) => {
    navigate('/account', {
      state: {
        activeTab: 'scheduled',
        expandedJobId: jobId
      }
    });
  };

  const handleServiceClick = (service) => {
    if (service.active && service.route) {
      navigate(service.route);
    } else {
      toast({
        title: "Coming Soon",
        description: "This service is currently unavailable. Check back later!",
        variant: "default"
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error("Logout failed", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* 1. Header Section */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-5 w-auto">
            <img alt="ReadyNest Logo" className="h-full w-auto object-contain" src="https://raw.githubusercontent.com/Alsabbagh16/ReadyNestAssets/refs/heads/main/text4.png" />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  {hasNewPurchases && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 rounded-full border-2 border-white z-10 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </span>              
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Account</span>
                  {hasNewPurchases && <span className="ml-auto w-2 h-2 bg-red-600 rounded-full"></span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Report a Problem</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>Log In</Button>
              <Button onClick={() => navigate('/auth')}>Sign Up</Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 md:p-8 lg:p-10 space-y-8">
        {/* 2. Welcome Section with Jobs Slider */}
        <section>
          {authLoading ? (
            <div className="flex items-center space-x-4 animate-pulse">
              <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Link to="/account">
                  <motion.div whileTap={{ scale: 0.95 }} className="relative">
                    <Avatar className="h-16 w-16 border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors">
                      <AvatarImage src={profile?.avatar_url} alt={displayName} />
                      <AvatarFallback className="text-xl font-bold text-primary bg-primary/10">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    {hasNewPurchases && (
                      <span className="absolute top-0 right-0 h-4 w-8 bg-red-600 rounded-full border-0 border-white z-10 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">New</span>
                      </span>              
                    )}
                  </motion.div>
                </Link>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Welcome back,</p>
                  <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                  <Badge variant="outline" className="mt-1 text-xs font-normal border-primary/30 text-primary bg-primary/5 uppercase tracking-wide">
                    {userType}
                  </Badge>
                </div>
              </div>

              {/* Jobs Slider */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Your Recent Jobs</h3>
                  {user && jobs.length > 0 && (
                    <Link to="/account" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center">
                      View All <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  )}
                </div>

                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {!user ? (
                    <div className="w-full px-4 py-6 text-center bg-gray-50 border border-dashed rounded-lg min-w-[200px]">
                      <p className="text-xs text-gray-500 mb-2">Log in to view your jobs</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/auth')}>Log In</Button>
                    </div>
                  ) : loadingJobs ? (
                    <div className="flex space-x-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="w-[180px] h-24 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : jobs.length > 0 ? (
                    jobs.slice(0, 5).map((job) => {
                      const jobDate = job.preferred_date ? new Date(job.preferred_date) : new Date();
                      const address = job.user_address || {};
                      const locationStr = address.label
                        ? address.label
                        : (address.city || address.street || "Location details");
                      
                      return (
                        <motion.div
                          key={job.job_ref_id}
                          className="snap-center shrink-0 w-[180px]"
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card className="h-full border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center text-gray-500 text-xs truncate max-w-[100px]" title={locationStr}>
                                  <MapPin className="h-2.5 w-2.5 mr-1 flex-shrink-0" /> <span className="truncate">{locationStr}</span>
                                </div>
                                {getStatusBadge(job.status)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm truncate" title={job.product_name}>{job.product_name}</h4>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Clock className="h-2.5 w-2.5 mr-1" /> {format(jobDate, 'MMM d')}
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                {job.status?.toLowerCase() === 'completed' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[9px] px-1 text-primary hover:text-primary/80 hover:bg-primary/5 -ml-1"
                                    onClick={() => handleBookAgain(job)}
                                    disabled={isBookingAgain}
                                  >
                                    {isBookingAgain ? <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" /> : <RotateCw className="h-2.5 w-2.5 mr-1" />}
                                    Book
                                  </Button>
                                ) : <div />}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-xs p-0 text-gray-400 hover:text-primary"
                                  onClick={() => handleDetailsClick(job.job_ref_id)}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="w-full px-4 py-6 text-center bg-gray-50 border border-dashed rounded-lg min-w-[200px]">
                      <p className="text-xs text-gray-500 mb-2">No jobs found</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/hourlybooking')}>Book Now</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Welcome to ReadyNest</h2>
                  <p className="text-sm text-muted-foreground mt-1">Sign in to manage your home services.</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => navigate('/auth')} className="w-full font-semibold">Log In</Button>
                <Button onClick={() => navigate('/auth')} variant="outline" className="w-full font-semibold">Create Account</Button>
              </div>
            </div>
          )}
        </section>

        {/* 4. Services Grid */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => (
              <motion.button
                key={service.id}
                whileTap={service.active ? { scale: 0.97 } : {}}
                onClick={() => handleServiceClick(service)}
                className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-sm border transition-colors group ${service.active
                  ? 'bg-white border-gray-100 hover:border-primary/50 cursor-pointer'
                  : 'bg-gray-50 border-transparent cursor-not-allowed opacity-80'
                  }`}
              >
                <div className={`p-3 rounded-full mb-3 ${service.color} ${service.active ? 'group-hover:scale-110' : ''} transition-transform`}>
                  {service.icon}
                </div>
                <span className={`text-sm font-semibold ${service.active ? 'text-gray-700' : 'text-gray-400'}`}>
                  {service.name}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Promotional Banner */}
        <PromotionalBanner />

        {/* 5. Product Cards */}
        <CompactProductCards />
      </div>

      {/* Mobile Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <a
          href="https://wa.me/97333215180"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="rounded-full h-14 w-14 shadow-xl bg-[#25D366] hover:bg-[#20bd5a] p-0 flex items-center justify-center transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          </Button>
        </a>
      </div>
    </div>
  );
};

export default Home2Page;