import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-12 md:pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 md:mb-12">
          {/* Column 1: Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-primary">ReadyNest</h3>
            <p className="text-gray-400 mb-4 text-sm">
              Professional cleaning for homes & businesses. Reliable service, sparkling results.
            </p>
            <div className="flex space-x-4">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/#services" className="text-gray-400 hover:text-white transition-colors">Apartment Cleaning</Link></li>
              <li><Link to="/#services" className="text-gray-400 hover:text-white transition-colors">Small Home Cleaning</Link></li>
              <li><Link to="/#services" className="text-gray-400 hover:text-white transition-colors">Medium Home Cleaning</Link></li>
              <li><Link to="/#pricing" className="text-gray-400 hover:text-white transition-colors">Personal Plans</Link></li>
              <li><Link to="/#pricing" className="text-gray-400 hover:text-white transition-colors">Business Credits</Link></li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about-us" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support & Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/cancellation-policy" className="text-gray-400 hover:text-white transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-center text-gray-500 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} ReadyNest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;