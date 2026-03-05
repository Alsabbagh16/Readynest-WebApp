import { supabase } from '@/lib/supabase';

// Helper to generate a purchase reference ID (simpler than full UUID)
export const generatePurchaseRefId = () => {
    return 'PUR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export const buildPurchaseData = (
    selections, 
    matchedProduct, 
    selectedAddons, 
    addonTemplates, 
    date2, // Using date2 parameter for the primary date
    additionalBookingDates, 
    finalPrice, 
    user, 
    profile, 
    addresses, 
    selectedAddressId, 
    isGuestFlowActive, 
    guestDetails,
    appliedCouponData = null
) => {
    
    // Determine user details based on flow (Auth vs Guest)
    let userId = null;
    let email = '';
    let name = '';
    let userPhone = ''; 
    let addressData = {}; 

    if (user) {
        userId = user.id;
        email = user.email;
        name = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : email;
        userPhone = profile?.phone || ''; 

        const addr = addresses.find(a => a.id === selectedAddressId);
        if (addr) {
            addressData = {
                street: addr.street,
                city: addr.city,
                state: addr.state,
                zip: addr.zip || addr.zip_code, 
                country: addr.country,
                phone: addr.phone,       
                alt_phone: addr.alt_phone
            };
            if (!userPhone && addr.phone) {
                userPhone = addr.phone;
            }
        }
    } else if (isGuestFlowActive) {
        email = guestDetails.email;
        name = guestDetails.fullName;
        userPhone = guestDetails.phone; 
        
        addressData = {
            street: guestDetails.street,
            city: guestDetails.city,
            state: guestDetails.state,
            zip: guestDetails.zip,
            country: 'Bahrain', 
            phone: guestDetails.phone 
        };
    }

    // Resolve Addon Details for JSONB storage
    const resolvedAddons = selectedAddons.map(id => {
        const template = addonTemplates.find(t => t.id === id);
        return template ? { id: template.id, name: template.name, price: template.price } : null;
    }).filter(Boolean);

    // Date Handling
    // TRUST THE INPUT. Do not convert to Date object if it's already a string.
    // If we receive a string (e.g., "2024-01-20T10:30"), we store it as is.
    // This preserves the exact date and time selected by the user without timezone shifting.
    let formattedBookingDate = date2;
    if (date2 instanceof Date) {
         formattedBookingDate = date2.toISOString();
    }

    const formattedAdditionalDates = {};
    if (additionalBookingDates) {
        Object.keys(additionalBookingDates).forEach(key => {
            const val = additionalBookingDates[key];
            if (val) {
                if (typeof val === 'string') {
                    formattedAdditionalDates[key] = val; // Store string directly
                 } else if (val instanceof Date) {
                    formattedAdditionalDates[key] = val.toISOString();
                 } else {
                    formattedAdditionalDates[key] = val;
                 }
            }
        });
    }

    // Determine financial values
    const baseAmount = finalPrice; 
    
    let couponId = null;
    let couponCode = null;
    let discountAmount = 0;
    let finalAmountDue = baseAmount;

    if (appliedCouponData) {
        couponId = appliedCouponData.coupon?.id;
        couponCode = appliedCouponData.coupon?.code;
        discountAmount = appliedCouponData.discountAmount || 0;
        finalAmountDue = appliedCouponData.finalAmount || 0;
    }

    // Construct the payload
    const payload = {
        purchase_ref_id: generatePurchaseRefId(),
        user_id: userId,
        email: email,
        name: name,
        user_phone: userPhone, 
        address: addressData, 
        
        product_id: matchedProduct?.id || null, 
        product_name: matchedProduct?.name || 'Custom Booking',
        
        payment_type: 'Pay Later', 
        paid_amount: baseAmount, 
        status: 'pending',
        
        preferred_booking_date: formattedBookingDate, 
        additional_preferred_dates: formattedAdditionalDates, 
        
        selected_addons: resolvedAddons,
        
        raw_selections: selections, 
        
        coupon_id: couponId,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        final_amount_due_on_arrival: finalAmountDue,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    return payload;
};