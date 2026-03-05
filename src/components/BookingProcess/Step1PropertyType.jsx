import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Home, Building } from 'lucide-react';
import SelectionCard from '@/components/BookingProcess/SelectionCard';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const Step1PropertyType = ({ onSelect, currentSelection }) => (
  <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
    <CardHeader className="text-center mb-6">
      <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Are you looking to clean your...</CardTitle>
      <CardDescription className="mt-2 text-lg text-muted-foreground">Select the type of property you need services for.</CardDescription>
    </CardHeader>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SelectionCard
        icon={<Home />}
        title="My Home"
        altText="Cozy modern living room"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//MyHome.jpg"
        selected={currentSelection === 'home'}
        onSelect={() => onSelect('home')}
      />
      <SelectionCard
        icon={<Building />}
        title="My Airbnb Rentals"
        altText="Stylish modern apartment balcony"
        imageUrl="https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//Airbnb.jpg"
        selected={currentSelection === 'airbnb'}
        onSelect={() => onSelect('airbnb')}
      />
    </div>
  </motion.div>
);

export default Step1PropertyType;