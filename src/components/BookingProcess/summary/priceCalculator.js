import { personalSubscriptionPlans, businessSubscriptionPlans } from '@/lib/services';

export const calculateBookingPrice = (selections, matchedProduct, selectedAddons, currentAddonTemplates) => {
  let basePrice = 0;

  if (matchedProduct && matchedProduct.price !== null && matchedProduct.price !== undefined) {
    basePrice = Number(matchedProduct.price);
  } else if (selections.planId) {
    const allPlans = [...personalSubscriptionPlans, ...businessSubscriptionPlans];
    const plan = allPlans.find(p => p.id === selections.planId);
    if (plan && plan.price !== null && plan.price !== undefined && !isNaN(Number(plan.price))) {
      basePrice = Number(plan.price);
    }
  }
  
  if (basePrice === 0) {
    if (selections.propertyType === 'home') {
      if (selections.homeSize === 'compact') basePrice = 80;
      else if (selections.homeSize === 'small') basePrice = 100;
      else if (selections.homeSize === 'medium') basePrice = 150;
      else if (selections.homeSize === 'large') basePrice = 200;
    } else if (selections.propertyType === 'airbnb') {
      if (selections.homeSize === 'small') basePrice = 120;
      else if (selections.homeSize === 'medium') basePrice = 180;
      else if (selections.homeSize === 'large') basePrice = 250;
    }
  }
  
  if (selections.cleaningType === 'recurring' && !(matchedProduct && matchedProduct.price) && !selections.planId) {
    basePrice *= 0.9; 
  }

  const addonsPrice = selectedAddons.reduce((total, addonId) => {
    const addon = currentAddonTemplates.find(a => a.id === addonId);
    return total + (addon && addon.price !== null && addon.price !== undefined ? Number(addon.price) : 0);
  }, 0);

  return basePrice + addonsPrice;
};