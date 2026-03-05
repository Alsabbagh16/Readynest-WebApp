import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building, Home, Building2, Castle } from 'lucide-react';
import SelectionCard from '@/components/BookingProcess/SelectionCard';

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const homeSizeOptions = [
  {
    key: 'compact',
    icon: <Building size={20} />,
    title: "Compact",
    description: "Studio, One Bedroom flats, Small Offices",
    altText: "Neat and organized compact living space or small office",
    imageUrl: "https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//CompactHome.jpg"
  },
  {
    key: 'small',
    icon: <Home size={22} />,
    title: "Small",
    description: "Two to Three Bedroom Flats, 3BR Small Villa",
    altText: "Cozy and comfortable small house interior",
    imageUrl: "https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//Small%20home.jpg"
  },
  {
    key: 'medium',
    icon: <Building2 size={24} />,
    title: "Medium",
    description: "Four & Five Bedroom Villas",
    altText: "Spacious medium-sized villa exterior with garden",
    imageUrl: "https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//MediumHome.jpg"
  },
  {
    key: 'large',
    icon: <Castle size={28} />,
    title: "Large",
    description: "Large Villas, Five Bedroom +",
    altText: "Grand and luxurious large villa with expansive grounds",
    imageUrl: "https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//LargeHome.jpg"
  }
];

const Step2HomeSize = ({ onSelect, currentSelection }) => (
  <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepVariants.transition}>
    <CardHeader className="text-center mb-6">
      <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">What Size Is Your Property?</CardTitle>
      <CardDescription className="mt-2 text-lg text-muted-foreground">Choose the option that best describes your space.</CardDescription>
    </CardHeader>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {homeSizeOptions.map((option) => (
        <SelectionCard
          key={option.key}
          icon={option.icon}
          title={option.title}
          description={option.description}
          altText={option.altText}
          imageUrl={option.imageUrl}
          selected={currentSelection === option.key}
          onSelect={() => onSelect(option.key)}
        />
      ))}
    </div>
  </motion.div>
);

export default Step2HomeSize;