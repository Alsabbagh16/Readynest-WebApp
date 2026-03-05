import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/contexts/AuthContext';

const PaymentOptions = ({ formData, setFormData, errors, priceDetails }) => {
  const { user, credits } = useAuth();
  const canPayWithCredits = user && formData.type === 'single' && !formData.isQuote && credits > 0; // Basic check, refine as needed

  const handleCreditPaymentChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      payWithCredits: checked
    }));
  };

  // Calculate effective price based on credit payment selection
  const effectivePrice = formData.payWithCredits ? 0 : priceDetails.totalPrice;
  const creditsNeeded = 1; // Example: 1 credit per cleaning. Adjust as needed.
  const hasEnoughCredits = credits >= creditsNeeded;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment</h3>

      {canPayWithCredits && (
        <div className="flex items-center space-x-2 p-3 border rounded-md bg-blue-50 border-blue-200">
          <Checkbox
            id="payWithCredits"
            checked={formData.payWithCredits}
            onCheckedChange={handleCreditPaymentChange}
            disabled={!hasEnoughCredits}
          />
          <Label htmlFor="payWithCredits" className={`flex-grow ${!hasEnoughCredits ? 'text-gray-400' : ''}`}>
            Use 1 Credit (Available: {credits})
            {!hasEnoughCredits && <span className="text-red-500 text-xs ml-2">(Not enough credits)</span>}
          </Label>
        </div>
      )}

      {/* Placeholder for actual payment integration (e.g., Stripe Elements) */}
      {!formData.isQuote && (
         <div className="p-4 border rounded-md">
            {formData.payWithCredits && hasEnoughCredits ? (
                 <p className="text-center text-green-600 font-semibold">Payment covered by credits!</p>
            ) : (
                <>
                    <p className="text-center text-muted-foreground mb-2">Total Due: ${effectivePrice.toFixed(2)}</p>
                    <div className="h-10 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500">
                        Payment Gateway Placeholder (e.g., Stripe)
                    </div>
                    {errors.payment && <p className="text-red-500 text-xs mt-1 text-center">{errors.payment}</p>}
                </>
            )}
         </div>
      )}

       {formData.isQuote && (
         <div className="p-4 border rounded-md bg-gray-50">
            <p className="text-center text-muted-foreground">You are requesting a quote. No payment is required now.</p>
         </div>
      )}

    </div>
  );
};

export default PaymentOptions;