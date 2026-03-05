import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';
import { useToast } from "@/components/ui/use-toast";
import { fetchAddonTemplates } from '@/lib/storage/productStorage';
import { useLocation } from 'react-router-dom';
import { validateBookingTime } from '@/lib/timeWindowValidator';

import Step1PropertyType from '@/components/BookingProcess/Step1PropertyType';
import Step2HomeSize from '@/components/BookingProcess/Step2HomeSize';
import Step2AirbnbSize from '@/components/BookingProcess/Step2AirbnbSize'; 
import Step3CleaningType from '@/components/BookingProcess/Step3CleaningType';
import Step3AirbnbCleaningType from '@/components/BookingProcess/Step3AirbnbCleaningType';
import Step4DateSelection from '@/components/BookingProcess/Step4DateSelection';
import BookingSummaryPage from '@/components/BookingProcess/BookingSummaryPage';

const BookingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { selections, updateSelection, findAndSetMatchingProduct, resetSelections, matchedProduct, loadingProductMatch, dateTime, bookingDates } = useBooking();
  const { toast } = useToast();
  const [addonTemplates, setAddonTemplates] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(true); 
  const location = useLocation();

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (location.state?.step) {
      setCurrentStep(location.state.step);
      if (location.state.step >= 4 && selections.propertyType && selections.homeSize && selections.cleaningType && !matchedProduct) {
         findAndSetMatchingProduct();
      }
    }
  }, [location.state, selections, matchedProduct, findAndSetMatchingProduct]);

  useEffect(() => {
    if (currentStep === 4) {
      if ((selections.propertyType === 'home' || selections.propertyType === 'airbnb') && selections.homeSize && selections.cleaningType) {
        findAndSetMatchingProduct();
      }
    }
  }, [currentStep, selections, findAndSetMatchingProduct]);

  useEffect(() => {
    const loadAddons = async () => {
      try {
        setLoadingAddons(true);
        const templates = await fetchAddonTemplates();
        setAddonTemplates(templates);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not load addon services. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingAddons(false);
      }
    };
    loadAddons();
  }, [toast]);

  const totalSteps = selections.propertyType === 'home' ? 5 : selections.propertyType === 'airbnb' ? 5 : 1;
  const progress = (currentStep / totalSteps) * 100;

  const handleSelection = useCallback((stepKey, value) => {
    updateSelection(stepKey, value);
    setTimeout(() => {
        setCurrentStep(prev => prev + 1);
    }, 300);
  }, [updateSelection]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const isNextDisabled = () => {
    if (currentStep === 1 && !selections.propertyType) return true;
    if (currentStep === 2 && !selections.homeSize) return true;
    if (currentStep === 3 && !selections.cleaningType) return true;
    
    // Step 4: Date Validation using Single Source of Truth
    if (currentStep === 4) { 
        if (!dateTime) return true;
        
        // Strict Time Window Check
        const validation = validateBookingTime(dateTime);
        if (!validation.isValid) return true;

        if (selections.cleaningType === 'recurring') {
            if (!bookingDates.date2 || !bookingDates.date3 || !bookingDates.date4) return true;
            if (!validateBookingTime(bookingDates.date2).isValid) return true;
            if (!validateBookingTime(bookingDates.date3).isValid) return true;
            if (!validateBookingTime(bookingDates.date4).isValid) return true;
        }
    }
    
    if (loadingProductMatch) return true;
    return false;
  };

  const isNextHiddenOnMobile = currentStep < 4;

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1PropertyType onSelect={(value) => handleSelection('propertyType', value)} currentSelection={selections.propertyType} />;
      case 2:
        if (selections.propertyType === 'home') {
          return <Step2HomeSize onSelect={(value) => handleSelection('homeSize', value)} currentSelection={selections.homeSize} />;
        } else if (selections.propertyType === 'airbnb') {
          return <Step2AirbnbSize onSelect={(value) => handleSelection('homeSize', value)} currentSelection={selections.homeSize} />;
        }
        return null; 
      case 3:
        if (selections.propertyType === 'home') {
          return <Step3CleaningType onSelect={(value) => handleSelection('cleaningType', value)} currentSelection={selections.cleaningType} />;
        } else if (selections.propertyType === 'airbnb') {
          return <Step3AirbnbCleaningType onSelect={(value) => handleSelection('cleaningType', value)} currentSelection={selections.cleaningType} />;
        }
        return null;
      case 4:
        return <Step4DateSelection />;
      case 5:
        return <BookingSummaryPage addonTemplates={addonTemplates} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-card shadow-2xl border-border dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-6 sm:p-10">
              {currentStep <= totalSteps && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-primary dark:text-sky-400">
                      Step {currentStep} of {totalSteps}
                    </span>
                    {currentStep > 1 && (
                       <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground hover:text-primary dark:text-slate-400 dark:hover:text-sky-400">
                         <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                       </Button>
                    )}
                  </div>
                  <Progress value={progress} className="w-full h-2 [&>div]:bg-gradient-to-r [&>div]:from-sky-500 [&>div]:to-cyan-500" />
                </div>
              )}
              
              <AnimatePresence mode="wait">
                <div key={currentStep}>
                  {renderCurrentStep()}
                </div>
              </AnimatePresence>

              {currentStep < totalSteps && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-10 flex justify-between items-center"
                >
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-500/10"
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    onClick={nextStep}
                    className={`bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold disabled:opacity-60 ${isNextHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}
                    disabled={isNextDisabled()}
                  >
                    {loadingProductMatch ? 'Matching...' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingPage;