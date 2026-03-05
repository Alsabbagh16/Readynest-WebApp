import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, CalendarDays } from 'lucide-react';
import SelectionCard from '@/components/BookingProcess/SelectionCard';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const Step3CleaningType = ({ onSelect, currentSelection }) => (
  <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
    <CardHeader className="text-center mb-6">
      <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">What type of House Cleaning are you looking for?</CardTitle>
      <CardDescription className="mt-2 text-lg text-muted-foreground">Let us know how often you'd like our services.</CardDescription>
    </CardHeader>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SelectionCard
        icon={<Sparkles />}
        title="A One Time Service"
        description="Perfect for a deep clean or special occasions."
        altText="Sparkling clean kitchen after a one-time service"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//onetime.jpg"
        selected={currentSelection === 'one-time'}
        onSelect={() => onSelect('one-time')}
      />
      <SelectionCard
        icon={<CalendarDays />}
        title="Weekly or Scheduled Routine"
        description="Keep your home consistently clean with regular visits."
        altText="Calendar indicating a recurring cleaning schedule"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//recurring.jpg"
        selected={currentSelection === 'recurring'}
        onSelect={() => onSelect('recurring')}
      />
    </div>
  </motion.div>
);

export default Step3CleaningType;