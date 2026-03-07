import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CompactProductCards = () => {
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
            categories (id, name)
          `)
          .eq("isActive", true)
          .order("created_at", { ascending: false })
          .limit(6); // Limit to 6 for compact view

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
      <section className="py-8 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2 text-foreground">Quick & Ready Packages</h2>
            <p className="text-sm text-muted-foreground">Choose from our pre-designed cleaning packages</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-6">
          <motion.h2
            className="text-xl font-bold mb-2 text-foreground"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Quick & Ready Packages
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Choose from our pre-designed cleaning packages
          </motion.p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <Card className="flex flex-row overflow-hidden border hover:shadow-lg transition-shadow duration-300 group h-32">
                <CardContent className="flex-grow p-4 flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1 flex-1 mr-2">{product.name}</h3>
                      <Badge className="bg-primary/90 text-primary-foreground text-[10px] backdrop-blur-sm shadow-sm px-2 py-0.5 flex-shrink-0">
                        {formatType(product.type)}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground">From</span>
                      <span className="text-lg font-bold text-primary">BD {Number(product.price).toFixed(0)}</span>
                    </div>
                    <Button asChild className="group/btn h-7 text-xs px-3">
                      <Link to={`/book-product/${product.id}`}>
                        Book Now
                        <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto text-center bg-card rounded-xl p-6 mt-8 shadow-lg border"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-bold mb-2 text-primary">For Property Managers & Buildings</h3>
          <p className="text-sm mb-4 text-muted-foreground">
            For buildings and multi-unit portfolios, pricing depends on scale and frequency. Contact us for a custom quote.
          </p>
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-600/90 text-white">
            <Link to="/contact">Contact Us</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CompactProductCards;
