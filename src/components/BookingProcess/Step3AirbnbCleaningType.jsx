import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, CalendarClock } from 'lucide-react';
import SelectionCard from '@/components/BookingProcess/SelectionCard';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const Step3AirbnbCleaningType = ({ onSelect, currentSelection }) => (
  <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
    <CardHeader className="text-center mb-6">
      <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">What type of Frequency are you looking for?</CardTitle>
      <CardDescription className="mt-2 text-lg text-muted-foreground">Select the cleaning frequency for your Airbnb.</CardDescription>
    </CardHeader>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SelectionCard
        icon={<RefreshCw />}
        title="Turnover Clean"
        description="A thorough clean between guest stays to prepare for new arrivals. (One Time Service)"
        altText="Cleaning supplies ready for an Airbnb turnover"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//onetime.jpg"
        selected={currentSelection === 'one-time'}
        onSelect={() => onSelect('one-time')}
      />
      <SelectionCard
        icon={<CalendarClock />}
        title="Weekly Recurring Clean"
        description="Regular weekly cleaning to maintain high standards for longer stays or frequent bookings."
        altText="Calendar highlighting a weekly recurring cleaning schedule"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//recurring.jpg"
        selected={currentSelection === 'recurring'}
        onSelect={() => onSelect('recurring')}
      />
    </div>
  </motion.div>
);

export default Step3AirbnbCleaningType;