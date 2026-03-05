import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { testimonials } from "@/lib/services";
import { Star } from "lucide-react";

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Auto-rotation for mobile
  useEffect(() => {
    if (!isAutoRotating) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 3000); // Rotate every 3 seconds for faster sliding

    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Touch handlers for swipe functionality
  const handleTouchStart = (e) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoRotating(false); // Stop auto-rotation when user interacts
    
    // Resume auto-rotation after 5 seconds of inactivity
    setTimeout(() => {
      setIsAutoRotating(true);
    }, 5000);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - go to next testimonial
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    } else if (isRightSwipe) {
      // Swipe right - go to previous testimonial
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
      );
    }
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    setIsAutoRotating(false); // Stop auto-rotation when user manually selects
    
    // Resume auto-rotation after 5 seconds of inactivity
    setTimeout(() => {
      setIsAutoRotating(true);
    }, 5000);
  };

  return (
    <section id="testimonials" className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-left max-w-3xl mx-auto mb-12 md:mb-16 md:text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-lg text-gray-600">
            Hear directly from clients who trust ReadyNest for their cleaning needs.
          </p>
        </div>

        {/* Mobile Floating Carousel */}
        <div className="md:hidden">
          <div className="relative overflow-hidden"
               onMouseEnter={() => setIsAutoRotating(false)}
               onMouseLeave={() => setIsAutoRotating(true)}>
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="w-full flex-shrink-0 px-2"
                >
                  <motion.div
                    className="testimonial-card bg-background rounded-xl overflow-hidden shadow-lg p-6 border border-gray-100 flex flex-col mx-auto max-w-sm"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                         <img  alt={`${testimonial.name} avatar`} className="w-12 h-12 rounded-full object-cover" src={testimonial.avatar} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm md:text-base">{testimonial.name}</h4>
                        <p className="text-xs text-gray-500">{testimonial.role}</p>
                        {testimonial.service && <p className="text-xs text-primary font-medium">{testimonial.service}</p>}
                      </div>
                    </div>
                    <div className="mb-4 flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < testimonial.rating ? 'text-[#f4b303] fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm md:text-base flex-grow">{testimonial.content}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Dots */}
          <div className="flex justify-center mt-6 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-primary w-8' 
                    : 'bg-gray-300 hover:bg-gray-400 w-2'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <motion.div
          className="hidden md:grid md:grid-cols-2 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              className="testimonial-card bg-background rounded-xl overflow-hidden shadow-lg p-6 border border-gray-100 flex flex-col"
              variants={itemVariants}
            >
              <div className="flex items-center mb-4">
                <div className="mr-4">
                   <img  alt={`${testimonial.name} avatar`} className="w-12 h-12 rounded-full object-cover" src={testimonial.avatar} />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base">{testimonial.name}</h4>
                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                  {testimonial.service && <p className="text-xs text-primary font-medium">{testimonial.service}</p>}
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${i < testimonial.rating ? 'text-[#f4b303] fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm md:text-base flex-grow">{testimonial.content}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;