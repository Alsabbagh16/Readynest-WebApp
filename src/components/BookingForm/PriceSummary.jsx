import React from "react";
import { businessSubscriptionPlans } from "@/lib/services";

const PriceSummary = ({ price, bookingType, planCategory, selectedPlanId, isUsingCredits = false, creditCost = 1 }) => {
  let description = "";
  let priceLabel = "Estimated Price:";
  let displayPrice = price;

  if (isUsingCredits) {
    priceLabel = "Payment Method:";
    displayPrice = `${creditCost} Credit${creditCost > 1 ? 's' : ''}`;
    description = `Using ${creditCost} credit${creditCost > 1 ? 's' : ''} from your balance.`;
  } else if (bookingType === "subscription") {
    if (planCategory === 'personal') {
      description = "This price applies to each cleaning under your personal plan. Manage anytime.";
      priceLabel = "Price Per Cleaning:";
    } else {
      // Business Plan
      const plan = businessSubscriptionPlans.find(p => p.id === selectedPlanId);
      if (plan) {
        priceLabel = "Package Price:";
        description = `Purchase ${plan.credits} cleaning credit${plan.credits > 1 ? 's' : ''}. Use credits to book future cleanings.`;
        if (plan.credits === 1) {
           priceLabel = "Price Per Credit:";
           description = "Purchase cleaning credits individually. Use credits to book future cleanings.";
        }
      }
    }
  } else {
    // Single Booking (not using credits)
    description = "Final price may vary based on the actual condition of your home.";
  }


  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm md:text-base">{priceLabel}</span>
        <span className="text-xl md:text-2xl font-bold text-primary">
            {isUsingCredits ? displayPrice : `$${displayPrice}`}
        </span>
      </div>
      {description && (
        <p className="text-xs md:text-sm text-gray-500 mt-2">
          {description}
        </p>
      )}
    </div>
  );
};

export default PriceSummary;