import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Hero = () => {
  const heroImageUrl = "https://rajqootheupvbejwfrgh.supabase.co/storage/v1/object/public/images//Hero.jpg";
  const customer1Url = "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80";
  const customer2Url = "https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80";
  const customer3Url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80";


  return (
    <section id="home" className="pt-10 pb-16 md:pt-32 md:pb-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-12">
          <motion.div
            className="flex-1 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-5 md:mb-6">
              Its Time to Relax, <span className="text-primary">A Clean home is Just <span className="relative inline-block px-2">
                <span className="relative z-10">2.4BD</span>
                {/* Sparkle 1 - Top Left */}
                <motion.svg
                  className="absolute -top-1 -left-1 w-4 h-4 text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1, 0.8, 1], opacity: [0, 1, 0.7, 1] }}
                  transition={{ duration: 1.2, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </motion.svg>
                {/* Sparkle 2 - Bottom Right */}
                <motion.svg
                  className="absolute -bottom-1 -right-2 w-3.5 h-3.5 text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1, 0.8, 1], opacity: [0, 1, 0.7, 1] }}
                  transition={{ duration: 1.2, delay: 1.1, repeat: Infinity, repeatDelay: 2 }}
                >
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </motion.svg>
              </span> an hour.</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 max-w-2xl">
              Why buy supplies? We bring the professional equipment and chemicals to you. Get a complete, worry-free clean for as low as 2.4 BD/hr.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-start">
              <Button asChild size="lg" className="text-base">
                <Link to="/hourlybooking">Book a Cleaning</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to="/#pricing" onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById('pricing');
                  if (element) {
                    window.scrollTo({ top: element.offsetTop - 80, behavior: 'smooth' });
                  } else {
                     // Fallback if element not found immediately (e.g. different page)
                    window.location.href = '/#pricing';
                  }
                }}>Explore Services</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-start space-x-4">
              <div className="flex -space-x-2">
                {customer1Url && <img alt="Happy customer 1" className="w-10 h-10 rounded-full border-2 border-white object-cover" src={customer1Url} />}
                {customer2Url && <img alt="Happy customer 2" className="w-10 h-10 rounded-full border-2 border-white object-cover" src={customer2Url} />}
                {customer3Url && <img alt="Happy customer 3" className="w-10 h-10 rounded-full border-2 border-white object-cover" src={customer3Url} />}
              </div>
              <div className="text-sm">
                <span className="font-bold text-gray-900">500+</span>
                <span className="text-gray-600 ml-1">happy customers</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="flex-1 w-full max-w-lg lg:max-w-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 md:w-24 md:h-24 bg-primary/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -right-8 w-24 h-24 md:w-40 md:h-40 bg-accent/10 rounded-full blur-xl"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video lg:aspect-square">
                 {heroImageUrl ? (
                    <img alt="Bright and clean modern kitchen" className="w-full h-full object-cover" src={heroImageUrl} />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <p className="text-gray-500">Loading image...</p>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
          <motion.div
            className="p-4 md:p-6 rounded-xl bg-white shadow-sm text-left md:text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">5+</h3>
            <p className="text-xs md:text-sm text-gray-600">Years Experienced Cleaners</p>
          </motion.div>
          <motion.div
            className="p-4 md:p-6 rounded-xl bg-white shadow-sm text-left md:text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">500+</h3>
            <p className="text-xs md:text-sm text-gray-600">Cleanings Done</p>
          </motion.div>
          <motion.div
            className="p-4 md:p-6 rounded-xl bg-white shadow-sm text-left md:text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">98%</h3>
            <p className="text-xs md:text-sm text-gray-600">Satisfaction Rate</p>
          </motion.div>
          <motion.div
            className="p-4 md:p-6 rounded-xl bg-white shadow-sm text-left md:text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">Easy</h3>
            <p className="text-xs md:text-sm text-gray-600">Online Booking</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;