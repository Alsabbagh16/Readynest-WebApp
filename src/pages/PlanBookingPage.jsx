import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '@/contexts/BookingContext';
import { personalSubscriptionPlans, businessSubscriptionPlans } from '@/lib/services'; 
import Step2HomeSize from '@/components/BookingProcess/Step2HomeSize';
import Step2AirbnbSize from '@/components/BookingProcess/Step2AirbnbSize';
import Step4DateSelection from '@/components/BookingProcess/Step4DateSelection'; // Import Date Selection Step
import BookingSummaryPage from '@/components/BookingProcess/BookingSummaryPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { validateBookingTime } from '@/lib/timeWindowValidator';

const PlanBookingPage = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selections, updateSelection, findAndSetMatchingProduct, resetSelections, loadingProductMatch, dateTime, bookingDates } = useBooking();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
  const [allAddonTemplates, setAllAddonTemplates] = useState([]); 

  useEffect(() => {
    resetSelections(); 
    const allPlans = [...personalSubscriptionPlans, ...businessSubscriptionPlans];
    const plan = allPlans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlanDetails(plan);
      updateSelection('planId', plan.id); 
      updateSelection('propertyType', plan.propertyType);
      updateSelection('cleaningType', plan.cleaningType);
    } else {
      navigate('/#pricing'); 
    }
  }, [planId, updateSelection, navigate, resetSelections]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleSizeSelect = async (size) => {
    updateSelection('homeSize', size); 
    setCurrentStep(2);
  };
  
  useEffect(() => {
    if (currentStep === 2 && selections.propertyType && selections.homeSize && selections.cleaningType && !loadingProductMatch) {
      findAndSetMatchingProduct();
    }
  }, [currentStep, selections, findAndSetMatchingProduct]);

  const handleDateNext = () => {
      // Validate DateTime using Single Source of Truth
      if (!dateTime) {
          toast({ title: "Date Required", description: "Please select a preferred date and time.", variant: "destructive"});
          return;
      }
      const val1 = validateBookingTime(dateTime);
      if (!val1.isValid) {
          toast({ title: "Invalid Time", description: val1.error, variant: "destructive" });
          return;
      }

      // Validate Recurring Dates
      if (selections.cleaningType === 'recurring') {
          if (!bookingDates.date2 || !bookingDates.date3 || !bookingDates.date4) {
             toast({ title: "All Dates Required", description: "Please select all 4 preferred slots for your recurring plan.", variant: "destructive"});
             return;
          }
          
          for (let i = 2; i <= 4; i++) {
              const val = validateBookingTime(bookingDates[`date${i}`]);
              if (!val.isValid) {
                  toast({ title: "Invalid Time", description: `Date ${i}: ${val.error}`, variant: "destructive" });
                  return;
              }
          }
      }
      setCurrentStep(3);
  };

  const isNextDisabled = () => {
      if (!dateTime) return true;
      if (!validateBookingTime(dateTime).isValid) return true;
      
      if (selections.cleaningType === 'recurring') {
          if (!bookingDates.date2 || !bookingDates.date3 || !bookingDates.date4) return true;
          if (!validateBookingTime(bookingDates.date2).isValid) return true;
          if (!validateBookingTime(bookingDates.date3).isValid) return true;
          if (!validateBookingTime(bookingDates.date4).isValid) return true;
      }
      return false;
  };

  const pageVariants = {
    initial: { opacity: 0, x: "100vw" },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: "-100vw" }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  if (!selectedPlanDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md bg-card shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Loading Plan...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        if (selectedPlanDetails.propertyType === 'airbnb') {
          return (
            <Step2AirbnbSize
              onSelect={handleSizeSelect}
              currentSelection={selections.homeSize} 
            />
          );
        }
        return (
          <Step2HomeSize
            onSelect={handleSizeSelect}
            currentSelection={selections.homeSize}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
             <Card className="bg-card shadow-xl border-border dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-6">
                    <Step4DateSelection />
                    <div className="flex justify-end mt-6">
                        <Button onClick={handleDateNext} disabled={isNextDisabled()} className="w-full sm:w-auto">
                            Next <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                </CardContent>
             </Card>
          </div>
        );
      case 3:
        return (
          <BookingSummaryPage 
            addonTemplates={allAddonTemplates} 
          />
        );
      default:
        return <div>Invalid step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100 dark:from-slate-900 dark:via-slate-800 dark:to-stone-900 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <motion.div
          key="plan-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground dark:text-white">
            Booking: <span className="text-primary dark:text-sky-400">{selectedPlanDetails.name}</span>
          </h1>
          <p className="mt-2 text-lg text-muted-foreground dark:text-slate-400">
            Let's get some details for your <span className="font-semibold">{selectedPlanDetails.propertyType === 'home' ? 'home' : 'property'}</span>.
          </p>
        </motion.div>

        {currentStep > 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlanBookingPage;