import { Award, Zap, Gem, ShieldCheck, Home, Building } from 'lucide-react';

export const navLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/#our-values" },
  { name: "Pricing", path: "/#pricing" },
  { name: "Contact", path: "/contact" },
];

export const personalSubscriptionPlans = [
  {
    id: "personal_one_time",
    name: "One-Time",
    price: null, 
    description: "Perfect for a trial run or an occasional deep clean.",
    features: [
      "Great for trying out the service",
      "On-Demand Scheduling",
      "Professional cleaning team",
      "Satisfaction guaranteed"
    ],
    buttonText: "Choose This Plan",
    isOneTime: true,
    propertyType: "home", 
    cleaningType: "one-time",
  },
  {
    id: "personal_weekly",
    name: "Weekly Plan",
    price: null, 
    description: "Keep your home consistently sparkling with our weekly visits.",
    features: [
      "4 cleanings per month",
      "Flexible scheduling",
      "Professional cleaning team",
      "Satisfaction guaranteed"
    ],
    buttonText: "Choose This Plan", 
    popular: true,
    propertyType: "home",
    cleaningType: "recurring",
  },
  {
    id: "personal_nest_pro",
    name: "Nest Pro",
    price: "XX", 
    description: "Our premium recurring service for the ultimate peace of mind. Coming Soon!",
    features: [
      "Customizable cleaning frequency",
      "Dedicated cleaning professional",
      "Priority support",
      "Exclusive member perks"
    ],
    buttonText: "Coming Soon",
    disabled: true,
    propertyType: "home",
    cleaningType: "recurring",
  },
];


export const businessSubscriptionPlans = [
  {
    id: "business_one_time_turnover",
    name: "One-Time Turnover",
    price: null, 
    description: "Ideal for single Airbnb turnovers or preparing a rental property.",
    features: [
      "Thorough cleaning between guests",
      "Linen service (optional)",
      "Restocking essentials (optional)",
      "Quick turnaround"
    ],
    buttonText: "Choose This Plan",
    popular: false,
    disabled: false,
    isOneTime: true,
    propertyType: "airbnb",
    cleaningType: "one-time", 
  },
  {
    id: "business_recurring_plan",
    name: "Recurring Plan",
    price: null, 
    description: "Keep your Airbnb consistently guest-ready with scheduled cleanings.",
    features: [ 
      "4 Cleanings",
      "Flexible Scheduling",
      "Linen and Restocking (optional)",
      "Guest-Ready"
    ],
    buttonText: "Choose This Plan",
    popular: true,
    disabled: false,
    isOneTime: false,
    propertyType: "airbnb",
    cleaningType: "recurring", 
  },
  {
    id: "business_enterprise",
    name: "Enterprise Solution",
    price: "Contact for pricing", 
    description: "Tailored solutions for property managers with multiple units.",
    features: [
      "Customized cleaning schedules",
      "Volume discounts",
      "Dedicated account manager",
      "Reporting and analytics"
    ],
    buttonText: "Contact Us",
    popular: false,
    disabled: false, 
    isOneTime: false,
    propertyType: "airbnb", 
    cleaningType: "recurring" 
  },
];

export const services = [
  { 
    id: "residential-cleaning", 
    icon: <Home className="h-10 w-10 text-primary" />, 
    title: 'Residential Cleaning', 
    description: 'Deep cleaning services for homes of all sizes. Breathe easy in a spotless environment.',
    basePrice: 25 
  },
  { 
    id: "commercial-cleaning", 
    icon: <Building className="h-10 w-10 text-primary" />, 
    title: 'Commercial Cleaning', 
    description: 'Tailored cleaning solutions for offices, retail spaces, and other commercial properties.',
    basePrice: 50
  },
   {
    id: "airbnb-turnover",
    icon: <Zap className="h-10 w-10 text-primary" />,
    title: "Airbnb Turnover",
    description: "Fast and reliable cleaning for short-term rentals.",
    basePrice: 30 
  }
];

export const calculatePrice = (serviceId, planId = null) => {
  const service = services.find(s => s.id === serviceId);
  
  let baseServicePrice = 0;
  if (service) {
    baseServicePrice = service.basePrice;
  }

  if (!planId) return baseServicePrice;

  const allPlans = [...personalSubscriptionPlans, ...businessSubscriptionPlans];
  const plan = allPlans.find(p => p.id === planId);

  if (!plan || plan.price === "Contact Us" || plan.price === "Contact for pricing" || plan.price === "XX" || plan.price === null || plan.price === undefined) {
    return baseServicePrice; 
  }
  
  const numericPrice = parseFloat(plan.price);
  return isNaN(numericPrice) ? baseServicePrice : numericPrice;
};

export const testimonials = [
  {
    id: 1,
    name: "Aisha K.",
    avatar: "AK",
    title: "Homeowner",
    quote: "Absolutely thrilled with the deep cleaning service! My apartment hasn't looked this good since I moved in. The team was professional and meticulous.",
    rating: 5,
    bgColor: "bg-pink-100", 
    textColor: "text-pink-700"
  },
  {
    id: 2,
    name: "Omar S.",
    avatar: "OS",
    title: "Office Manager",
    quote: "Clean Sweep Services has been a game-changer for our office. Reliable, efficient, and always a pleasure to work with. Highly recommend!",
    rating: 5,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700"
  },
  {
    id: 3,
    name: "Layla R.",
    avatar: "LR",
    title: "Airbnb Host",
    quote: "Switching to Clean Sweep for my Airbnb turnover cleaning was the best decision. Guests consistently comment on how sparkling clean the place is!",
    rating: 5,
    bgColor: "bg-green-100",
    textColor: "text-green-700"
  }
];


export const faqs = [
  {
    question: "What services do you offer?",
    answer: "We offer a range of cleaning services including residential cleaning (one-time and recurring), commercial cleaning, and specialized services for Airbnb hosts and property managers.",
  },
  {
    question: "How do I book a cleaning service?",
    answer: "You can easily book our services online through our website. Simply select your desired service, property size, preferred date and time, and provide your contact details. You can also call us or send an email.",
  },
  {
    question: "Are your cleaners insured and vetted?",
    answer: "Yes, all our cleaning professionals are fully insured, background-checked, and undergo rigorous training to ensure the highest quality of service and your peace of mind.",
  },
  {
    question: "What if I'm not satisfied with the cleaning?",
    answer: "Your satisfaction is our top priority. If you're not completely satisfied with our service, please contact us within 24 hours, and we'll make it right, whether it's a re-clean of specific areas or another appropriate solution.",
  },
  {
    question: "Do I need to provide cleaning supplies?",
    answer: "We come fully equipped with all necessary professional-grade cleaning supplies and equipment. However, if you have specific products you'd like us to use, please let us know in advance.",
  },
];