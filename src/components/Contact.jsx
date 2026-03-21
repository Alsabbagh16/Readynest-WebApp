import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Phone, Mail, Clock, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useLocation } from "react-router-dom";
import { sendContactReportNotification } from '@/lib/whatsappService';

const Contact = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill message if available in location state
  useEffect(() => {
    if (location.state?.prefilledMessage) {
      setMessage(location.state.prefilledMessage);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !email || !message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: { name, email, phone, message }
      });

      if (error) {
        throw new Error(error.message || "Failed to invoke function");
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
        variant: "default", 
        className: "bg-green-50 border-green-200 text-green-900"
      });

      // Send WhatsApp notification (non-blocking)
      if (phone) {
        sendContactReportNotification({
          name,
          email,
          phone,
          message
        }).catch(err => console.error('WhatsApp contact notification failed:', err));
      }

      setName("");
      setEmail("");
      setMessage("");

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error Sending Message",
        description: "There was a problem sending your message. Please try again later or email us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-left max-w-3xl mx-auto mb-12 md:mb-16 md:text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h2>
          <p className="text-lg text-gray-600">
            Have questions or need a custom quote? Get in touch with our friendly team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow border border-gray-100">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-6">Get In Touch</h3>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div>
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your Name"
                  className="mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone (Optional)</Label>
                <Input
                  id="contact-phone"
                  type="tel" // Use 'tel' type for better mobile keyboard experience
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="contact-message">Message</Label>
                <textarea
                  id="contact-message"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] md:min-h-[120px] mt-1"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="How can we help you?"
                  disabled={loading}
                ></textarea>
              </div>
              <Button type="submit" className="w-full text-base py-3" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-6">Contact Information</h3>

            <div className="space-y-5 md:space-y-6">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-primary mr-3 md:mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1 text-sm md:text-base">Our Location</h4>
                  <p className="text-gray-600 text-sm">CR: 183715-1, Block 213, Road 51, Building 564, Flat 21<br /> Muharraq, Bahrain</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-5 w-5 text-primary mr-3 md:mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1 text-sm md:text-base">Phone</h4>
                  <p className="text-gray-600 text-sm">+973 33215180</p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="h-5 w-5 text-primary mr-3 md:mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1 text-sm md:text-base">Email</h4>
                  <p className="text-gray-600 text-sm">support@readynest.co</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-primary mr-3 md:mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1 text-sm md:text-base">Business Hours</h4>
                  <p className="text-gray-600 text-sm">
                    Monday - Friday: 8:00 AM - 6:00 PM<br />
                    Saturday: 9:00 AM - 4:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        {/* Mobile Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <a
          href="https://wa.me/97333215180"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="rounded-full h-14 w-14 shadow-xl bg-[#25D366] hover:bg-[#20bd5a] p-0 flex items-center justify-center transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          </Button>
        </a>
      </div>
      </div>
    </section>
  );
};

export default Contact;