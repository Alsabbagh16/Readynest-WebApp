import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { services, personalSubscriptionPlans, businessSubscriptionPlans, calculatePrice } from "@/lib/services";
import { addBooking as saveBooking } from "@/lib/storage/bookingStorage"; 
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import BookingTypeTabs from "@/components/BookingForm/BookingTypeTabs";
import ServicePlanSelection from "@/components/BookingForm/ServicePlanSelection";
import DateTimeSelection from "@/components/BookingForm/DateTimeSelection";
import ContactDetails from "@/components/BookingForm/ContactDetails";
import PaymentOptions from "@/components/BookingForm/PaymentOptions";
import { Button } from "@/components/ui/button"; 
import { validateBookingTime } from "@/lib/timeWindowValidator";

const BookingForm = ({ isQuotePage = false }) => {
  const { toast } = useToast();
  const { user, credits, updateCredits, addresses } = useAuth(); 

  const [formData, setFormData] = useState({
    bookingType: "single",
    planCategory: "personal",
    selectedService: services[0]?.id || "",
    selectedPlan: "",
    date: "",
    time: "",
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "", 
    payWithCredits: false,
    isQuote: isQuotePage,
  });

  const [priceDetails, setPriceDetails] = useState({ basePrice: 0, totalPrice: 0 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const serviceCostInCredits = 1; 

  useEffect(() => {
    if (formData.bookingType === 'subscription') {
      const defaultPlan = formData.planCategory === 'business'
        ? businessSubscriptionPlans.find(p => p.popular)?.id || businessSubscriptionPlans[0]?.id
        : personalSubscriptionPlans.find(p => p.popular)?.id || personalSubscriptionPlans[0]?.id;
      setFormData(prev => ({ ...prev, selectedPlan: defaultPlan || "" }));
    } else {
      setFormData(prev => ({ ...prev, selectedPlan: "" }));
    }
  }, [formData.planCategory, formData.bookingType]);

  useEffect(() => {
     if (user) {
        setFormData(prev => ({
            ...prev,
            name: prev.name || user.name || "",
            email: prev.email || user.email || "",
        }));
     }
  }, [user]);

  useEffect(() => {
    let calculatedPrice = 0;
    if (formData.bookingType === 'single') {
      calculatedPrice = calculatePrice(formData.selectedService);
    } else if (formData.bookingType === 'subscription') {
      calculatedPrice = calculatePrice(formData.selectedService, formData.selectedPlan);
    }
    setPriceDetails({ basePrice: calculatedPrice, totalPrice: calculatedPrice }); 
  }, [formData.selectedService, formData.selectedPlan, formData.bookingType, formData.planCategory]);

  useEffect(() => {
    if (formData.bookingType !== 'single' || formData.isQuote) {
      setFormData(prev => ({ ...prev, payWithCredits: false }));
    }
  }, [formData.bookingType, formData.isQuote]);

  const validateForm = () => {
      const newErrors = {};
      if (!formData.date) newErrors.date = "Date is required.";
      if (!formData.time) newErrors.time = "Time is required.";
      if (!formData.name) newErrors.name = "Name is required.";
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Valid email is required.";
      if (!formData.phone) newErrors.phone = "Phone number is required."; 
      if (!formData.address) newErrors.address = "Address is required.";
      if (formData.bookingType === 'subscription' && !formData.selectedPlan) newErrors.plan = "Subscription plan is required.";
      
      // Time Validation
      if (formData.date && formData.time) {
          const dateTimeStr = `${formData.date}T${formData.time}`;
          const timeValidation = validateBookingTime(dateTimeStr);
          if (!timeValidation.isValid) {
              newErrors.time = "Please choose a time between 08:30 and 17:00.";
          }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
         toast({
            title: "Validation Error",
            description: "Please correct the errors in the form.",
            variant: "destructive",
          });
        return;
    }

    setLoading(true);

    if (formData.payWithCredits && credits < serviceCostInCredits) {
       toast({
        title: "Insufficient Credits",
        description: `You need ${serviceCostInCredits} credit(s) for this service, but only have ${credits}.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const bookingData = {
      type: formData.bookingType,
      planCategory: formData.bookingType === 'subscription' ? formData.planCategory : null,
      serviceId: formData.selectedService,
      planId: formData.bookingType === 'subscription' ? formData.selectedPlan : null,
      date: formData.date,
      time: formData.time,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address, 
      price: formData.payWithCredits ? 0 : priceDetails.totalPrice,
      paidWithCredits: formData.payWithCredits ? serviceCostInCredits : 0,
      status: formData.isQuote ? 'quote_requested' : (formData.payWithCredits ? 'booked_credit' : 'booked_pending_payment')
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 700));

      // Note: addBooking handles server-side validation internally by throwing error if invalid
      const savedBooking = await saveBooking({
        ...bookingData,
        dateTime: `${formData.date}T${formData.time}` 
      }); 

      let successTitle = "Success!";
      let successDescription = "";

      if (formData.isQuote) {
        successTitle = "Quote Request Sent!";
        successDescription = `We've received your request for ${format(new Date(formData.date), "MMMM d, yyyy")} at ${formData.time}. We'll contact you shortly.`;
      } else if (formData.payWithCredits) {
        updateCredits(-serviceCostInCredits); 
        successTitle = "Booked with Credits!";
        successDescription = `Your cleaning using ${serviceCostInCredits} credit(s) is scheduled for ${format(new Date(formData.date), "MMMM d, yyyy")} at ${formData.time}.`;
      } else if (formData.bookingType === 'subscription' && formData.planCategory === 'business') {
         const plan = businessSubscriptionPlans.find(p => p.id === formData.selectedPlan);
         if (plan && plan.credits) updateCredits(plan.credits); 
         successTitle = "Business Plan Purchased!";
         successDescription = `Your ${plan?.name} plan is active. You now have ${credits + (plan?.credits || 0)} credits. Payment processing simulated.`;
      } else {
         successTitle = "Booking Pending Payment";
         successDescription = `Your cleaning for ${format(new Date(formData.date), "MMMM d, yyyy")} at ${formData.time} is reserved. Payment processing simulated.`;
      }

      toast({ title: successTitle, description: successDescription });

      setFormData(prev => ({
          ...prev,
          date: "",
          time: "",
          address: user && addresses.length > 0 ? prev.address : "", 
          phone: user ? prev.phone : "", 
          payWithCredits: false,
          selectedService: services[0]?.id || "",
          selectedPlan: formData.bookingType === 'subscription' 
            ? (formData.planCategory === 'business' 
                ? businessSubscriptionPlans.find(p => p.popular)?.id || businessSubscriptionPlans[0]?.id 
                : personalSubscriptionPlans.find(p => p.popular)?.id || personalSubscriptionPlans[0]?.id) 
            : "",
      }));
      setErrors({});


    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        title: "Booking Error",
        description: `There was a problem submitting your booking: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
        setLoading(false);
    }
  };

  const pageTitle = formData.isQuote ? "Get a Cleaning Quote" : "Book Your Cleaning";
  const pageDescription = formData.isQuote
    ? "Fill out the form below to get a personalized quote."
    : "Schedule a cleaning service or subscribe to a plan.";
  const submitButtonText = formData.isQuote
    ? "Request Quote"
    : (formData.payWithCredits ? `Book with ${serviceCostInCredits} Credit(s)` : `Book Now (BD ${priceDetails.totalPrice.toFixed(2)})`);


  return (
    <section id="booking" className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-left max-w-3xl mx-auto mb-12 md:mb-16 md:text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{pageTitle}</h2>
          <p className="text-lg text-gray-600">{pageDescription}</p>
        </div>

        <motion.div
          className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, amount: 0.1 }}
        >
          <form onSubmit={handleSubmit}>
             <div className="p-6 md:p-8 space-y-5 md:space-y-6">
               <BookingTypeTabs
                 bookingType={formData.bookingType}
                 setBookingType={(value) => setFormData(prev => ({ ...prev, bookingType: value }))}
                 planCategory={formData.planCategory}
                 setPlanCategory={(value) => setFormData(prev => ({ ...prev, planCategory: value }))}
               />
                <ServicePlanSelection
                  bookingType={formData.bookingType}
                  planCategory={formData.planCategory}
                  selectedService={formData.selectedService}
                  setSelectedService={(value) => setFormData(prev => ({ ...prev, selectedService: value }))}
                  selectedPlan={formData.selectedPlan}
                  setSelectedPlan={(value) => setFormData(prev => ({ ...prev, selectedPlan: value }))}
                  errors={errors}
                />
                <DateTimeSelection
                    date={formData.date}
                    setDate={(value) => setFormData(prev => ({ ...prev, date: value }))}
                    time={formData.time}
                    setTime={(value) => setFormData(prev => ({ ...prev, time: value }))}
                    errors={errors}
                />
                <ContactDetails
                  formData={formData}
                  setFormData={setFormData}
                  errors={errors}
                />
                <PaymentOptions
                  formData={formData}
                  setFormData={setFormData}
                  errors={errors}
                  priceDetails={priceDetails}
                />
                 <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Processing...' : submitButtonText}
                    </Button>
                 </div>
             </div>
           </form>
        </motion.div>
      </div>
    </section>
  );
};

export default BookingForm;