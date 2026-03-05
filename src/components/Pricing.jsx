import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Lock, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { personalSubscriptionPlans as initialPersonalPlans, businessSubscriptionPlans as initialBusinessPlans } from "@/lib/services";
import { supabase } from "@/lib/supabase";

const PlanCard = ({ plan, isLoadingOneTime, isLoadingRecurring }) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const displayLoading = (plan.isOneTime && isLoadingOneTime && plan.price === null) || 
                         (!plan.isOneTime && isLoadingRecurring && plan.price === null && !plan.disabled);

  return (
    <motion.div
      key={plan.id}
      variants={itemVariants}
      className="relative pricing-card"
    >
      <Card className={`h-full flex flex-col bg-card text-card-foreground ${plan.popular ? 'border-primary border-2 shadow-primary/30 shadow-lg' : 'border'} ${plan.disabled ? 'opacity-60 filter blur-[1px] pointer-events-none' : ''}`}>
        {plan.popular && !plan.disabled && (
          <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-full shadow-lg z-10">
            Most Popular
          </div>
        )}
        {plan.disabled && plan.buttonText === "Coming Soon" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform p-4 bg-slate-700/80 rounded-lg z-20 text-center">
            <Lock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">Currently Not Available</p>
          </div>
        )}
        <CardHeader>
          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
          <div className="mt-4 mb-2">
            {displayLoading ? (
              <div className="flex items-center text-primary h-[40px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-lg">Loading price...</span>
              </div>
            ) : plan.price !== null && plan.price !== undefined && !isNaN(Number(plan.price)) ? (
              <>
                <p className="text-sm text-muted-foreground mb-1">Starting at</p>
                <span className="text-4xl font-bold text-primary">BD {plan.price}</span>
                {!plan.isOneTime && !plan.disabled && <span className="text-muted-foreground">/month</span>}
              </>
            ) : plan.price === "Contact for pricing" || plan.price === "Custom" || plan.price === "XX" ? (
                 <span className="text-4xl font-bold text-primary">{plan.price}</span>
            ) : (
              <span className="text-lg font-semibold text-muted-foreground h-[40px] flex items-center">Price not available</span>
            )}
          </div>
          <p className="text-muted-foreground min-h-[40px]">{plan.description}</p>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start">
                <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full" disabled={plan.disabled && plan.buttonText === "Coming Soon"}>
            <Link to={plan.disabled && plan.buttonText === "Coming Soon" ? "#" : (plan.buttonText === 'Contact Us' ? '/contact' : `/book-plan/${plan.id}`)}>
              {plan.buttonText}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};


const Pricing = () => {
  const [planType, setPlanType] = useState("personal");
  const [personalPlans, setPersonalPlans] = useState(initialPersonalPlans);
  const [businessPlans, setBusinessPlans] = useState(initialBusinessPlans);
  
  const [isLoadingPersonalOneTimePrice, setIsLoadingPersonalOneTimePrice] = useState(true);
  const [isLoadingPersonalRecurringPrice, setIsLoadingPersonalRecurringPrice] = useState(true);
  const [isLoadingBusinessOneTimePrice, setIsLoadingBusinessOneTimePrice] = useState(true);
  const [isLoadingBusinessRecurringPrice, setIsLoadingBusinessRecurringPrice] = useState(true);

  useEffect(() => {
    const fetchPlanPrices = async () => {
      if (planType === "personal") {
        setIsLoadingPersonalOneTimePrice(true);
        setIsLoadingPersonalRecurringPrice(true);
        try {
          const [oneTimeRes, recurringRes] = await Promise.all([
            supabase
              .from('products')
              .select('price')
              .eq('type', 'one_time_service')
              .eq('property_type', 'home')
              .eq('isActive', true)
              .order('price', { ascending: true })
              .limit(1),
            supabase
              .from('products')
              .select('price')
              .eq('type', 'recurring_service')
              .eq('property_type', 'home')
              .eq('isActive', true)
              .order('price', { ascending: true })
              .limit(1)
          ]);

          if (oneTimeRes.error) throw oneTimeRes.error;
          if (recurringRes.error) throw recurringRes.error;
          
          const cheapestOneTimePrice = oneTimeRes.data && oneTimeRes.data.length > 0 ? oneTimeRes.data[0].price : null;
          const cheapestRecurringPrice = recurringRes.data && recurringRes.data.length > 0 ? recurringRes.data[0].price : null;

          setPersonalPlans(prevPlans => 
            prevPlans.map(plan => {
              if (plan.id === 'personal_one_time') {
                return { ...plan, price: cheapestOneTimePrice };
              }
              if (plan.id === 'personal_weekly') {
                return { ...plan, price: cheapestRecurringPrice };
              }
              return plan;
            })
          );
        } catch (error) {
          console.error("Error fetching personal service prices:", error);
          setPersonalPlans(prevPlans => 
            prevPlans.map(plan => {
              if (plan.id === 'personal_one_time' || plan.id === 'personal_weekly') {
                return { ...plan, price: null };
              }
              return plan;
            })
          );
        } finally {
          setIsLoadingPersonalOneTimePrice(false);
          setIsLoadingPersonalRecurringPrice(false);
        }
      } else if (planType === "business") {
        setIsLoadingBusinessOneTimePrice(true);
        setIsLoadingBusinessRecurringPrice(true);
        try {
          const [oneTimeRes, recurringRes] = await Promise.all([
            supabase
              .from('products')
              .select('price')
              .eq('type', 'one_time_service')
              .eq('property_type', 'airbnb')
              .eq('isActive', true)
              .order('price', { ascending: true })
              .limit(1),
            supabase
              .from('products')
              .select('price')
              .eq('type', 'recurring_service')
              .eq('property_type', 'airbnb')
              .eq('isActive', true)
              .order('price', { ascending: true })
              .limit(1)
          ]);

          if (oneTimeRes.error) throw oneTimeRes.error;
          if (recurringRes.error) throw recurringRes.error;
          
          const cheapestOneTimePrice = oneTimeRes.data && oneTimeRes.data.length > 0 ? oneTimeRes.data[0].price : null;
          const cheapestRecurringPrice = recurringRes.data && recurringRes.data.length > 0 ? recurringRes.data[0].price : null;

          setBusinessPlans(prevPlans => 
            prevPlans.map(plan => {
              if (plan.id === 'business_one_time_turnover') {
                return { ...plan, price: cheapestOneTimePrice };
              }
              if (plan.id === 'business_recurring_plan') {
                return { ...plan, price: cheapestRecurringPrice };
              }
              return plan;
            })
          );
        } catch (error) {
          console.error("Error fetching business service prices:", error);
          setBusinessPlans(prevPlans => 
            prevPlans.map(plan => {
              if (plan.id === 'business_one_time_turnover' || plan.id === 'business_recurring_plan') {
                return { ...plan, price: null };
              }
              return plan;
            })
          );
        } finally {
          setIsLoadingBusinessOneTimePrice(false);
          setIsLoadingBusinessRecurringPrice(false);
        }
      }
    };

    fetchPlanPrices();
  }, [planType]);


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const renderPersonalPlans = () => (
    <motion.div
      className="grid md:grid-cols-3 gap-6 md:gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {personalPlans.map((plan) => (
        <PlanCard 
          key={plan.id} 
          plan={plan} 
          isLoadingOneTime={isLoadingPersonalOneTimePrice}
          isLoadingRecurring={isLoadingPersonalRecurringPrice}
        />
      ))}
    </motion.div>
  );

  const renderBusinessPlans = () => (
    <motion.div
      className="grid md:grid-cols-3 gap-6 md:gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {businessPlans.map((plan) => (
         <PlanCard 
          key={plan.id} 
          plan={plan} 
          isLoadingOneTime={isLoadingBusinessOneTimePrice}
          isLoadingRecurring={isLoadingBusinessRecurringPrice}
        />
      ))}
    </motion.div>
  );

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-600"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Choose the perfect plan for your cleaning needs. No hidden fees, ever.
          </motion.p>
          <Tabs defaultValue="personal" value={planType} onValueChange={setPlanType} className="max-w-xs mx-auto">
            <TabsList className="grid w-full grid-cols-2 bg-muted border">
              <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">For Homeowners</TabsTrigger>
              <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">For Hosts</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-16">
          {planType === "personal" ? renderPersonalPlans() : renderBusinessPlans()}
        </div>

        <motion.div 
          className="max-w-3xl mx-auto text-center bg-card rounded-xl p-8 mt-16 shadow-xl border"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold mb-4 text-primary">For Property Managers & Buildings</h3>
          <p className="text-lg mb-6 text-muted-foreground">
            For buildings and multi-unit portfolios, pricing depends on scale and frequency. Contact us for a custom quote.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-600/90 text-white">
            <Link to="/contact">Contact Us</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;