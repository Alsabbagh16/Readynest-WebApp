import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBooking } from '@/contexts/BookingContext';
import { validateBookingTime } from '@/lib/timeWindowValidator';
import TimePickerInput from '@/components/ui/TimePickerInput';
import { useToast } from "@/components/ui/use-toast";

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const Step4DateSelection = () => {
  const { selections, dateTime, setDateTime, bookingDates, updateBookingDate } = useBooking();
  const { toast } = useToast();
  
  // Construct local date string without timezone offset math
  // This uses local system time to set the minimum valid date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Format: YYYY-MM-DDTHH:MM
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

  const handleDateTimeChange = (val) => {
    if (!val) {
        setDateTime('');
        return;
    }

    // Validate using string parsing (Face Value)
    const validation = validateBookingTime(val);
    if (!validation.isValid) {
        toast({
            title: "Invalid Time",
            description: validation.error || "Please select a time between 08:30 and 17:00",
            variant: "destructive"
        });
    }
    
    // Store exact string in context (Single Source of Truth) without converting to UTC
    setDateTime(val);
  };

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
      <CardHeader className="text-center mb-6">
        <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">When would you like us to come?</CardTitle>
        <CardDescription className="mt-2 text-lg text-muted-foreground">
          Select your preferred date and time. Our operating hours are 08:30 - 17:00.
        </CardDescription>
      </CardHeader>
      
      <div className="max-w-md mx-auto space-y-6">
        <TimePickerInput
            id="date1"
            label="Preferred Date & Time 1"
            value={dateTime}
            onChange={(e) => handleDateTimeChange(e.target.value)}
            min={minDateTime}
            required
        />

        {selections.cleaningType === 'recurring' && (
            <>
                {[2, 3, 4].map((num) => {
                    const key = `date${num}`;
                    const label = num === 2 ? 'Approx. 1 week later' : num === 3 ? 'Approx. 2 weeks later' : 'Approx. 3 weeks later';
                    return (
                        <TimePickerInput
                            key={key}
                            id={key}
                            label={`Preferred Date & Time ${num} (${label})`}
                            value={bookingDates[key]}
                            onChange={(e) => updateBookingDate(key, e.target.value)}
                            min={minDateTime}
                            required
                        />
                    );
                })}
                <p className="text-sm text-muted-foreground italic text-center mt-4">
                    *For recurring bookings, please select the first 4 slots. We will contact you to confirm the full schedule.
                </p>
            </>
        )}
      </div>
    </motion.div>
  );
};

export default Step4DateSelection;