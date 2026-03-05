import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Sparkles, Home, ShieldCheck, CalendarDays } from "lucide-react";

const valuesData = [
  {
    icon: <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-primary mb-3 md:mb-4" />,
    title: "Spotless Results, Every Time",
    description: "We don’t just clean — we restore comfort and freshness with attention to detail and consistency.",
  },
  {
    icon: <Home className="h-8 w-8 md:h-10 md:w-10 text-primary mb-3 md:mb-4" />,
    title: "Tailored Cleaning for Every Home",
    description: "From cozy apartments to large family homes, we personalize every service to fit your space and needs.",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 text-primary mb-3 md:mb-4" />,
    title: "Trusted & Vetted Cleaners",
    description: "Our team is professionally trained, background-checked, and committed to delivering reliable service.",
  },
  {
    icon: <CalendarDays className="h-8 w-8 md:h-10 md:w-10 text-primary mb-3 md:mb-4" />,
    title: "Flexible Scheduling & Transparent Pricing",
    description: "Book on your terms with no hidden fees — whether it’s a one-time deep clean or routine maintenance.",
  },
];

const OurValues = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
        duration: 0.5,
      },
    },
  };

  return (
    <section id="our-values" className="py-16 md:py-20 bg-gradient-to-br from-background to-secondary/30 dark:from-slate-900 dark:to-slate-800/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <motion.h2 
            initial={{ opacity:0, y:20}}
            whileInView={{ opacity:1, y:0}}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground dark:text-white"
          >
            Our Values & What We Offer
          </motion.h2>
          <motion.p 
            initial={{ opacity:0, y:20}}
            whileInView={{ opacity:1, y:0}}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-md md:text-lg text-muted-foreground dark:text-slate-400"
          >
            Dedicated to providing exceptional cleaning services with integrity and care.
          </motion.p>
        </div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {valuesData.map((value, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="h-full"
            >
              <Card className="h-full flex flex-col bg-card/80 dark:bg-slate-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300 border-primary/20 dark:border-primary/40 service-card">
                <CardHeader className="items-center text-center pt-6 md:pt-8">
                  {value.icon}
                  <CardTitle className="text-lg md:text-xl font-semibold text-foreground dark:text-white">{value.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow px-4 pb-6 md:px-6">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default OurValues;