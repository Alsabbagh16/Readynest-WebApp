import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { personalSubscriptionPlans } from '@/lib/services';

const BookingContext = createContext(null);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const BookingProvider = ({ children }) => {
  const [selections, setSelections] = useState({
    propertyType: null, 
    homeSize: null,     
    cleaningType: null, 
    planId: null, 
  });

  // SINGLE SOURCE OF TRUTH for the primary booking date and time.
  // Format: ISO 8601 string (e.g., "2026-01-20T10:30" or "2026-01-20T10:30:00.000Z")
  // stored exactly as received from the input/picker, without modification.
  const [dateTime, setDateTime] = useState('');

  // State for recurring dates (starting from date2)
  const [bookingDates, setBookingDates] = useState({
    date2: '',
    date3: '',
    date4: ''
  });

  const [prefilledData, setPrefilledData] = useState({
    addons: [],
    addressId: null
  });

  const [matchedProduct, setMatchedProduct] = useState(null); 
  const [loadingProductMatch, setLoadingProductMatch] = useState(false);
  const { toast } = useToast();

  const updateSelection = useCallback((stepKey, value) => {
    setSelections(prev => {
      let newSelections = { ...prev, [stepKey]: value };
      
      if (stepKey === 'planId') {
        const plan = personalSubscriptionPlans.find(p => p.id === value);
        if (plan) {
          newSelections.propertyType = plan.propertyType;
          newSelections.cleaningType = plan.cleaningType;
        }
      }
      
      if (stepKey === 'propertyType') {
        newSelections.homeSize = null;
        newSelections.cleaningType = newSelections.planId ? newSelections.cleaningType : null; 
        setMatchedProduct(null); 
      } else if (stepKey === 'homeSize') {
        newSelections.cleaningType = prev.cleaningType; 
        setMatchedProduct(null); 
      } else if (stepKey === 'cleaningType' && !newSelections.planId) { 
        setMatchedProduct(null); 
      }
      return newSelections;
    });
  }, []);

  const updateBookingDate = useCallback((key, value) => {
    if (key === 'date1') {
        setDateTime(value);
    } else {
        setBookingDates(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  // Setter for the primary single source of truth
  const setBookingDateTime = useCallback((val) => {
    setDateTime(val);
  }, []);

  const setBookingData = useCallback((data) => {
    if (data.selections) {
      setSelections(prev => ({ ...prev, ...data.selections }));
    }
    if (data.prefilled) {
      setPrefilledData(prev => ({ ...prev, ...data.prefilled }));
    }
    if (data.resetDates) {
      setDateTime('');
      setBookingDates({ date2: '', date3: '', date4: '' });
    }
  }, []);

  const findAndSetMatchingProduct = useCallback(async (customSelections) => {
    const currentSelections = customSelections || selections;

    if (!currentSelections.propertyType || !currentSelections.homeSize || !currentSelections.cleaningType) {
      setMatchedProduct(null); 
      setLoadingProductMatch(false);
      return null;
    }

    setLoadingProductMatch(true);
    setMatchedProduct(null);

    let dbPropertyType = currentSelections.propertyType === 'home' ? "Home" : 
                         currentSelections.propertyType === 'airbnb' ? "airbnb" : 
                         currentSelections.propertyType;

    let dbHomeSize = currentSelections.homeSize === 'small' ? "Small" : 
                     currentSelections.homeSize === 'medium' ? "Medium" : 
                     currentSelections.homeSize === 'large' ? "Large" : 
                     currentSelections.homeSize === 'compact' ? "Compact" : 
                     currentSelections.homeSize;
    
    let dbCleaningType = currentSelections.cleaningType === 'one-time' ? "one_time_service" : 
                         currentSelections.cleaningType === 'recurring' ? "recurring_service" : 
                         currentSelections.cleaningType;

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          property_type, 
          size, 
          type,
          product_addon_links (
            addon_templates (id, name, price, is_required)
          )
        `) 
        .ilike('property_type', dbPropertyType)
        .ilike('size', dbHomeSize)
        .ilike('type', dbCleaningType) 
        .eq('isActive', true) 
        .maybeSingle(); 

      if (productError) throw productError;

      if (productData) {
        const linkedAddons = productData.product_addon_links.map(link => link.addon_templates).filter(Boolean);
        const productWithLinkedAddons = { ...productData, linked_addons: linkedAddons };
        delete productWithLinkedAddons.product_addon_links; 

        setMatchedProduct(productWithLinkedAddons); 
        setLoadingProductMatch(false);
        return productWithLinkedAddons; 
      } else {
        const plan = currentSelections.planId ? personalSubscriptionPlans.find(p => p.id === currentSelections.planId) : null;
        if (plan) {
            const planBasedProduct = {
                id: plan.id, 
                name: plan.name,
                price: plan.price, 
                property_type: plan.propertyType,
                size: currentSelections.homeSize, 
                type: currentSelections.cleaningType, 
                linked_addons: [], 
                isPlanBased: true, 
            };
            setMatchedProduct(planBasedProduct);
        }
        setLoadingProductMatch(false);
        return plan ? matchedProduct : null; 
      }
    } catch (error) {
      console.error("[BookingContext] Error finding matching product:", error.message);
      setLoadingProductMatch(false);
      return null;
    }
  }, [selections]);

  const resetSelections = useCallback(() => {
    setSelections({
      propertyType: null,
      homeSize: null,
      cleaningType: null,
      planId: null,
    });
    setDateTime('');
    setBookingDates({ date2: '', date3: '', date4: '' });
    setPrefilledData({ addons: [], addressId: null });
    setMatchedProduct(null);
  }, []);

  const value = {
    selections,
    dateTime, // Expose the single source of truth
    setDateTime: setBookingDateTime,
    bookingDates,
    prefilledData,
    updateBookingDate,
    matchedProduct, 
    loadingProductMatch,
    updateSelection,
    findAndSetMatchingProduct,
    setBookingData,
    resetSelections,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};