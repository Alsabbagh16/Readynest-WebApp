import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';
import SelectionCard from '@/components/BookingProcess/SelectionCard';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const Step2AirbnbSize = ({ onSelect, currentSelection }) => (
  <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
    <CardHeader className="text-center mb-6">
      <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">What size is your Apartment?</CardTitle>
      <CardDescription className="mt-2 text-lg text-muted-foreground">Choose the option that best describes your Airbnb rental.</CardDescription>
    </CardHeader>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SelectionCard
        icon={<Building size={20} />}
        title="Studio / 1 Bedroom"
        description="Ideal for compact spaces and quick turnovers."
        altText="Modern studio apartment interior"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//Studio.jpg"
        selected={currentSelection === 'small'}
        onSelect={() => onSelect('small')}
      />
      <SelectionCard
        icon={<Building size={24} />}
        title="2 Bedrooms"
        description="Suitable for most standard apartment sizes."
        altText="Comfortable 2-bedroom apartment living area"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//2bedroom.jpg"
        selected={currentSelection === 'medium'}
        onSelect={() => onSelect('medium')}
      />
      <SelectionCard
        icon={<Building size={28} />}
        title="3 Bedrooms+"
        description="For larger apartments or multi-unit properties."
        altText="Spacious 3-bedroom apartment with open layout"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//3bedroom.jpg"
        selected={currentSelection === 'large'}
        onSelect={() => onSelect('large')}
      />
    </div>
  </motion.div>
);

export default Step2AirbnbSize;