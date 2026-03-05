import React from 'react';
import { User, Mail, Phone } from 'lucide-react';

const CustomerInfoDisplay = ({ booking, user }) => {
  return (
    <div className="space-y-3">
        <h3 className="font-semibold text-lg border-b pb-2">Customer Information</h3>
         <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span>{booking.name}</span>
         </div>
         <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span>{booking.email}</span>
         </div>
         <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span>{booking.phone || 'N/A'}</span>
         </div>
         {/* Optionally show user registration status */}
         {/* <p className="text-xs text-gray-500">{user ? '(Registered User)' : '(Guest Booking)'}</p> */}
    </div>
  );
};

export default CustomerInfoDisplay;