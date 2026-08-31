import React from "react";
import { Helmet } from "react-helmet";
import Hero from "@/components/Hero";
import OurValues from "@/components/OurValues"; 
import ProductCards from "@/components/ProductCards";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import RecentBlogs from "@/components/RecentBlogs";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Home Cleaning Services in Bahrain | Ready Nest</title>
        <meta
          name="description"
          content="Professional cleaning services in Bahrain from Ready Nest. Book reliable home, apartment, office and Airbnb cleaning with equipment and supplies included."
        />
        <meta
          name="keywords"
          content="cleaning services Bahrain, cleaning company Bahrain, home cleaning Bahrain, house cleaning Bahrain, professional cleaners Bahrain, office cleaning Bahrain, apartment cleaning Bahrain, Airbnb cleaning Bahrain, vacation rental cleaning Bahrain, cleaning service Manama, cleaning service Muharraq, Ready Nest Bahrain"
        />
      </Helmet>
      <main className="flex-grow">
        <Hero />
        <OurValues /> 
        <ProductCards />
        <Testimonials />
        <FAQ />
        <RecentBlogs />
      </main>
    </div>
  );
};

export default HomePage;
