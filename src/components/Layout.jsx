import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Layout = () => {
  const location = useLocation();
  const isHourlyBooking = ['/hourlybooking', '/hourly-booking'].includes(location.pathname);
  const hideFooter = isHourlyBooking || ['/careers/parttime', '/parttime'].includes(location.pathname.toLowerCase());

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
