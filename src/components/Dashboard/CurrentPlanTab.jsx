import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookings } from '@/lib/storage';
import { personalSubscriptionPlans, businessSubscriptionPlans, services } from '@/lib/services';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";

const CurrentPlanTab = () => {
  const { user, credits } = useAuth(); // Get credits from context
  const { toast } = useToast();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    const allBookings = getBookings();
    const latestSubscription = allBookings
      .filter(b => b.email === user.email && b.type === 'subscription' && b.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (latestSubscription) {
      const isBusiness = latestSubscription.planCategory === 'business';
      const planDetails = isBusiness
        ? businessSubscriptionPlans.find(p => p.id === latestSubscription.planId)
        : personalSubscriptionPlans.find(p => p.id === latestSubscription.planId);

      const serviceDetails = services.find(s => s.id === latestSubscription.serviceId);

      setCurrentSubscription({
        ...latestSubscription,
        planName: planDetails?.name || 'Unknown Plan',
        serviceName: serviceDetails?.name || 'Unknown Service',
        isBusiness: isBusiness,
        nextDate: latestSubscription.date ? format(new Date(new Date(latestSubscription.date).setMonth(new Date(latestSubscription.date).getMonth() + (planDetails?.id?.includes('monthly') ? 1 : 0))), 'MMMM d, yyyy') : 'N/A',
        // Credits are now managed globally in AuthContext, not tied to a specific plan purchase in this view
        planPrice: isBusiness ? planDetails?.price : latestSubscription.price
      });
    }
    setLoading(false);
  }, [user]);

  const handleCancelSubscription = () => {
    // This logic needs refinement. Cancelling should ideally happen via backend/API.
    // For localStorage demo, we might just mark the latest subscription booking as cancelled.
    if (currentSubscription) {
        // updateBooking(currentSubscription.id, { status: 'cancelled' }); // Example using storage function
        localStorage.setItem('cleanSweepBookings', JSON.stringify(
            getBookings().map(b => b.id === currentSubscription.id ? { ...b, status: 'cancelled' } : b)
        ));
        toast({ title: "Subscription Cancelled", description: "Your subscription has been marked as cancelled." });
        setCurrentSubscription(null); // Update UI
    } else {
         toast({ title: "Error", description: "No active subscription found to cancel.", variant: "destructive" });
    }
  };

   if (loading) {
    return <div className="p-6">Loading plan details...</div>;
  }

  return (
     <Card className="border-0 shadow-none rounded-none">
      <CardHeader>
        <CardTitle>Current Plan & Credits</CardTitle>
        <CardDescription>Manage your subscription and credit balance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         {/* Credit Balance Display */}
         <Card className="bg-primary/10 border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">Available Credits</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold text-primary">{credits}</p>
                <p className="text-sm text-primary/80 mt-1">Use credits to book single cleanings.</p>
                <Button size="sm" variant="link" className="p-0 h-auto text-primary mt-2" asChild>
                    <Link to="/#pricing">Purchase More Credits</Link>
                </Button>
            </CardContent>
         </Card>

         {/* Subscription Details */}
         <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">Active Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
                {!currentSubscription ? (
                    <>
                        <p className="text-gray-600">You do not have an active subscription.</p>
                        <Button asChild size="sm">
                            <Link to="/#pricing">Explore Plans</Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <p><span className="font-medium">Plan:</span> {currentSubscription.planName}</p>
                        <p><span className="font-medium">Status:</span> Active</p>
                        {currentSubscription.isBusiness ? (
                            <p className="text-xs text-gray-500">Business plans provide credits. See balance above.</p>
                        ) : (
                            <>
                                <p><span className="font-medium">Service:</span> {currentSubscription.serviceName}</p>
                                <p><span className="font-medium">Price per cleaning:</span> ${currentSubscription.planPrice}</p>
                                <p><span className="font-medium">Next Scheduled Cleaning:</span> {currentSubscription.date ? `${format(new Date(currentSubscription.date), 'MMMM d, yyyy')} at ${currentSubscription.time}` : 'N/A'}</p>
                            </>
                        )}
                        <div className="pt-4">
                            <Button variant="destructive" size="sm" onClick={handleCancelSubscription}>
                                Cancel Subscription
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
         </Card>
      </CardContent>
    </Card>
  );
};

export default CurrentPlanTab;