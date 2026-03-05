import { supabase } from '@/lib/supabase';

// Fetch service rates from system_settings table
export const fetchServiceRates = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'service_rates')
      .single();

    if (error) {
      console.error('Error fetching service rates:', error);
      console.log('Using fallback service rates');
      return getFallbackRates();
    }

    // Parse the JSON value from the database
    const serviceRates = data?.value ? JSON.parse(data.value) : null;
    
    if (!serviceRates) {
      console.log('No service rates found in database, using fallback');
      return getFallbackRates();
    }
    
    console.log('Service rates loaded from database:', serviceRates);
    return serviceRates;
  } catch (error) {
    console.error('Error parsing service rates:', error);
    console.log('Using fallback service rates');
    return getFallbackRates();
  }
};

// Fallback service rates if database fails
const getFallbackRates = () => {
  return {
    minHours: 2,
    maxCleaners: 4,
    pricePerCleaner: 3,
    subscriptionRate: 4, // Base multiplier for subscription
    subscriptionDiscount: 20,
    isActive: true
  };
};

// Calculate subscription amount based on configuration
export const calculateSubscriptionAmount = (standardAmount, subscriptionConfig) => {
  const { type, multiplier, discountPercentage } = subscriptionConfig;
  
  if (type === 'multiplier') {
    // Calculate based on multiplier then apply discount
    const multipliedAmount = standardAmount * multiplier;
    const discount = multipliedAmount * (discountPercentage / 100);
    return multipliedAmount - discount;
  } else if (type === 'percentage') {
    // Apply percentage discount directly
    const discount = standardAmount * (discountPercentage / 100);
    return standardAmount - discount;
  }
  
  return standardAmount;
};

// Calculate hourly service amount with subscription support
export const calculateHourlyAmount = (cleaners, hours, isSubscription, serviceRates) => {
  if (!serviceRates || !cleaners || !hours) {
    return 0;
  }

  const baseRate = serviceRates.pricePerCleaner;
  const standardAmount = cleaners * hours * baseRate;
  
  if (!isSubscription) {
    return standardAmount;
  }

  // Use new subscription calculation if available
  if (serviceRates.subscriptionCalculation && serviceRates.subscriptionCalculation.enabled) {
    return calculateSubscriptionAmount(standardAmount, serviceRates.subscriptionCalculation);
  }
  
  // Fallback to old subscription rate with proper formula
  const multipliedAmount = standardAmount * serviceRates.subscriptionRate;
  const discount = multipliedAmount * (serviceRates.subscriptionDiscount / 100);
  return multipliedAmount - discount;
};
