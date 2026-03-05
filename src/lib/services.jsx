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
    role: "Homeowner",
    content: "The booking process was easy, and the cleaner was on time and did a fantastic job. It saved us a lot of hassle. It’s the most reliable on-demand service we’ve found.",
    rating: 5,
    avatar: "https://raw.githubusercontent.com/Alsabbagh16/ReadyNestAssets/refs/heads/main/avatars/71.jpg",
    service: "One-Time Cleaning"
  },
  {
    id: 2,
    name: "Omar S.",
    role: "Office Manager",
    content: "I really like that they price by the size of the home, not by the hour. The team was very efficient and professional, and the price was completely transparent. Great value",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    service: "One-Time Cleaning"
  },
  {
    id: 3,
    name: "Layla R.",
    role: "Airbnb Host",
    content: "As a property manager, I need detail-oriented pros. Ready Nest handles our rental turnovers seamlessly, including the special add-ons. They are extremely professional and reliable.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    service: "Airbnb Turnover"
  },
  {
    id: 4,
    name: "Marcus T.",
    role: "Property Developer",
    content: "I signed up for the monthly plan to keep things consistent. It’s super convenient, flexible, and the platform is easy to use. The cleaning quality is excellent every time.",
    rating: 4,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    service: "Subscription Cleaning"
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