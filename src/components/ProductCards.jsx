import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageOff, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ProductCards = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            type,
            property_type,
            image_url,
            isActive,
            hidden_from_website,
            categories (id, name)
          `)
          .eq("isActive", true)
          .eq("hidden_from_website", false)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const formatType = (type) => {
    if (type === "one_time_service") return "One-Time";
    if (type === "recurring_service") return "Recurring";
    return type;
  };

  if (loading) {
    return (
      <section id="pricing" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Quick & Ready Packages</h2>
            <p className="text-lg text-muted-foreground">Choose from our pre-designed cleaning packages and book instantly.</p>
          </div>
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Quick & Ready Packages
          </motion.h2>
          <motion.p
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Choose from our pre-designed cleaning packages and book instantly.
          </motion.p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <Card className="h-full flex flex-col overflow-hidden border hover:shadow-lg transition-shadow duration-300 group">
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextElementSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 bg-muted items-center justify-center ${product.image_url ? "hidden" : "flex"}`}
                  >
                    <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    {product.categories?.name && (
                      <Badge variant="secondary" className="bg-white/90 text-foreground text-xs backdrop-blur-sm shadow-sm">
                        {product.categories.name}
                      </Badge>
                    )}
                    <Badge className="bg-primary/90 text-primary-foreground text-xs backdrop-blur-sm shadow-sm">
                      {formatType(product.type)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="flex-grow p-5">
                  <h3 className="text-lg font-bold text-foreground mb-1.5">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">Starting at</span>
                    <span className="text-2xl font-bold text-primary">BD {Number(product.price).toFixed(0)}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-0">
                  <Button asChild className="w-full group/btn">
                    <Link to={`/book-product/${product.id}`}>
                      Book Now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto text-center bg-card rounded-xl p-8 mt-16 shadow-xl border"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
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

export default ProductCards;
