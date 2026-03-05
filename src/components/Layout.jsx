import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Layout = () => {
  const location = useLocation();
  const isHourlyBooking = location.pathname === '/hourlybooking';

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      {!isHourlyBooking && <Footer />}
    </div>
  );
};

export default Layout;