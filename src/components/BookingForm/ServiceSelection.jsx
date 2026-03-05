import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { services, personalSubscriptionPlans, businessSubscriptionPlans } from "@/lib/services";

const ServiceSelection = ({ bookingType, planCategory, selectedService, setSelectedService, selectedPlan, setSelectedPlan }) => {

  const relevantPlans = planCategory === 'business' ? businessSubscriptionPlans : personalSubscriptionPlans;

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
      <div>
        <Label htmlFor="service">Service Type</Label>
        <Select
          value={selectedService}
          onValueChange={setSelectedService}
        >
          <SelectTrigger id="service">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Only show plan selection if bookingType is 'subscription' */}
      {bookingType === 'subscription' && (
        <div>
          <Label htmlFor="plan">Subscription Plan ({planCategory === 'business' ? 'Business' : 'Personal'})</Label>
          <Select
            value={selectedPlan}
            onValueChange={setSelectedPlan}
            required={bookingType === 'subscription'} // Make required only for subscriptions
          >
            <SelectTrigger id="plan">
              <SelectValue placeholder={`Select a ${planCategory} plan`} />
            </SelectTrigger>
            <SelectContent>
              {relevantPlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.type === 'personal' && ` (${plan.discount}% off)`}
                  {plan.type === 'business' && plan.credits > 1 && ` (${plan.credits} credits)`}
                  {plan.type === 'business' && plan.credits === 1 && ` (On-Demand)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

       {/* Placeholder for single booking to maintain layout */}
       {bookingType === 'single' && (
         <div className="hidden md:block h-[40px] mt-6"></div>
       )}
    </div>
  );
};

export default ServiceSelection;