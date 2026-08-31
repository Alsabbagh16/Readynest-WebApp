import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Clock3, ImageOff, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getAreaBySlug } from "@/lib/areas";
import { supabase } from "@/lib/supabase";

const formatType = (type) => {
  if (type === "one_time_service") return "One-Time";
  if (type === "recurring_service") return "Subscription";
  return type;
};

const AreaDetailPage = () => {
  const { locationSlug } = useParams();
  const area = getAreaBySlug(locationSlug);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [locationSlug]);

  useEffect(() => {
    if (!area) return undefined;

    let active = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: queryError } = await supabase
          .from("products")
          .select("id, name, description, price, type, property_type, image_url, isActive, hidden_from_website, categories (id, name)")
          .eq("isActive", true)
          .eq("hidden_from_website", false)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        if (active) {
          const sortedProducts = (data || []).sort((a, b) => Number(a.price) - Number(b.price));
          setProducts(sortedProducts);
        }
      } catch (queryError) {
        console.error("Error fetching area services:", queryError);
        if (active) setError("We could not load our services right now. Please try again shortly.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProducts();
    return () => { active = false; };
  }, [area]);

  if (!area) return <Navigate to="/areas" replace />;

  const title = `Cleaning Services ${area.name} Bahrain | Home & Office Cleaning | Ready Nest`;
  const description = `Book professional cleaning services in ${area.name}, Bahrain with Ready Nest. Home, apartment, office and scheduled cleaning with equipment and supplies included.`;
  const canonicalUrl = `https://readynest.co/areas/${area.slug}`;

  return (
    <div className="bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <section className="border-b bg-background">
        <div className="container mx-auto px-4 py-14 text-center md:py-20">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {area.governorate}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Cleaning Services in <span className="text-primary">{area.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Professional home, apartment and office cleaning in {area.name}, with equipment and supplies included.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="available-services-heading">
        <div className="mb-9 text-center">
          <h2 id="available-services-heading" className="text-2xl font-bold text-foreground md:text-3xl">
            Services available in {area.name}
          </h2>
          <p className="mt-2 text-muted-foreground">Choose a Ready Nest package and book online.</p>
        </div>

        {loading && (
          <div className="flex min-h-48 items-center justify-center" role="status">
            <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading services</span>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No packages are currently available. Please contact us for help booking a cleaning.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                    </div>
                  )}
                  <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
                    {formatType(product.type)}
                  </Badge>
                </div>
                <CardContent className="flex-grow p-5">
                  <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
                  {product.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">Starting at</span>
                    <span className="text-2xl font-bold text-primary">BD {Number(product.price).toFixed(0)}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Button asChild className="w-full">
                    <Link to={`/book-product/${product.id}`}>Book Now <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-10 text-center md:px-12">
          <Clock3 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Need flexible hourly cleaning?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Choose the number of cleaners and hours that suit your home or office in {area.name}.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/hourlybooking">Book Hourly Cleaning</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AreaDetailPage;
