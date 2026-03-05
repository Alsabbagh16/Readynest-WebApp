import React from "react";
import Hero from "@/components/Hero";
import OurValues from "@/components/OurValues"; 
import ProductCards from "@/components/ProductCards";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Hero />
        <OurValues /> 
        <ProductCards />
        <Testimonials />
        <FAQ />
      </main>
    </div>
  );
};

export default HomePage;