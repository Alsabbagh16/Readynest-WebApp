import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { areaGroups, allAreas } from "@/lib/areas";

const AreasPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
  <div className="bg-background">
    <Helmet>
      <title>Cleaning Service Areas in Bahrain | Ready Nest</title>
      <meta
        name="description"
        content="Explore Ready Nest cleaning service areas across Bahrain. Find professional home, apartment and office cleaning near you."
      />
      <link rel="canonical" href="https://readynest.co/areas" />
    </Helmet>

    <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="container mx-auto px-4 py-14 text-center md:py-20">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Areas we provide our services
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          Ready Nest provides professional cleaning across {allAreas.length} locations throughout Bahrain.
          Choose your area to view our available services.
        </p>
      </div>
    </section>

    <section className="container mx-auto space-y-12 px-4 py-12 md:py-16" aria-label="Service areas by governorate">
      {areaGroups.map((governorate) => (
        <div key={governorate.name}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b pb-3">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{governorate.name}</h2>
            <span className="text-sm font-medium text-muted-foreground">
              {governorate.areas.length} locations
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {governorate.areas.map((area) => (
              <Link
                key={area.slug}
                to={`/areas/${area.slug}`}
                className="group flex min-h-14 items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{area.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>

    <section className="container mx-auto px-4 pb-16 md:pb-24">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-sky-600 px-6 py-10 text-center text-white shadow-xl md:px-12">
        <h2 className="text-2xl font-bold md:text-3xl">Can&apos;t find your location?</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/85">
          Contact our team and we will confirm service availability in your area.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-6">
          <Link to="/contact">Contact Us</Link>
        </Button>
      </div>
    </section>
  </div>
  );
};

export default AreasPage;
