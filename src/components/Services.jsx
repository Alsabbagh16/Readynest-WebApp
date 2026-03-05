import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { services } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

const Services = () => {
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

  return (
    <section id="services" className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
          <p className="text-lg text-muted-foreground">
            Professional cleaning services tailored to your needs
          </p>
        </div>

        <motion.div
          className="grid md:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {services.map((service) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              className="service-card"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="aspect-video w-full overflow-hidden rounded-lg mb-4">
                    <img  className="w-full h-full object-cover" alt={service.title} src="https://images.unsplash.com/photo-1682037173605-0f84eb310d0f" />
                  </div>
                  <h3 className="text-xl font-bold">{service.name || service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-lg font-semibold text-primary">
                    Starting at BD {service.basePrice}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/hourlybooking">Book Now</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;