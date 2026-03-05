import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const BookingTypeTabs = ({ bookingType, setBookingType, planCategory, setPlanCategory }) => {
  return (
    <>
      <Tabs defaultValue="single" value={bookingType} onValueChange={setBookingType}>
        <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8">
          <TabsTrigger value="single">Single Cleaning</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
      </Tabs>

      {bookingType === 'subscription' && (
         <Tabs defaultValue="personal" value={planCategory} onValueChange={setPlanCategory} className="mb-6 md:mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Personal Plan</TabsTrigger>
              <TabsTrigger value="business">Business Credits</TabsTrigger>
            </TabsList>
         </Tabs>
       )}
    </>
  );
};

export default BookingTypeTabs;