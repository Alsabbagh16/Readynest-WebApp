import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Settings } from 'lucide-react';
import { useServiceRates } from '@/hooks/useServiceRates';

const ServiceRatesTab = () => {
  const { rates, loading: initialLoading, saveRates } = useServiceRates();
  const [serviceRates, setServiceRates] = useState({
    minHours: rates?.minHours || 2,
    maxCleaners: rates?.maxCleaners || 4,
    pricePerCleaner: rates?.pricePerCleaner || 15,
    subscriptionRate: rates?.subscriptionRate || 12,
    subscriptionDiscount: rates?.subscriptionDiscount || 20,
    isActive: rates?.isActive || true
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (rates) {
      setServiceRates({
        minHours: rates.minHours || 2,
        maxCleaners: rates.maxCleaners || 4,
        pricePerCleaner: rates.pricePerCleaner || 15,
        subscriptionRate: rates.subscriptionRate || 12,
        subscriptionDiscount: rates.subscriptionDiscount || 20,
        isActive: rates.isActive || true
      });
    }
  }, [rates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setServiceRates(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const parsedData = {
      minHours: parseInt(serviceRates.minHours, 10),
      maxCleaners: parseInt(serviceRates.maxCleaners, 10),
      pricePerCleaner: parseFloat(serviceRates.pricePerCleaner),
      subscriptionRate: parseFloat(serviceRates.subscriptionRate),
      subscriptionDiscount: parseFloat(serviceRates.subscriptionDiscount),
      isActive: serviceRates.isActive
    };

    if (parsedData.minHours < 1 || parsedData.minHours > 12) {
      toast({ title: "Validation Error", description: "Min hours must be between 1 and 12.", variant: "destructive" });
      setSaving(false);
      return;
    }
    
    if (parsedData.maxCleaners < 1 || parsedData.maxCleaners > 10) {
      toast({ title: "Validation Error", description: "Max cleaners must be between 1 and 10.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const result = await saveRates(parsedData);
    if (result.success) {
      toast({ title: "Success", description: "Service rates updated successfully." });
    } else {
      toast({ title: "Error", description: "Failed to update service rates.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (initialLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="border-0 shadow-none rounded-none max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-bold">
          <Settings className="mr-3 h-7 w-7 text-primary" />
          Service Rates
        </CardTitle>
        <CardDescription>Configure pricing and constraints for hourly bookings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pricePerCleaner">Price per Cleaner/Hour (BHD)</Label>
              <Input
                id="pricePerCleaner"
                name="pricePerCleaner"
                type="number"
                step="0.001"
                required
                value={serviceRates.pricePerCleaner}
                onChange={handleChange}
                placeholder="e.g. 5.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionRate">Subscription Multiplier (e.g., 0.9 for 10% off)</Label>
              <Input
                id="subscriptionRate"
                name="subscriptionRate"
                type="number"
                step="0.01"
                required
                value={serviceRates.subscriptionRate}
                onChange={handleChange}
                placeholder="e.g. 0.85"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionDiscount">Subscription Discount (%)</Label>
              <Input
                id="subscriptionDiscount"
                name="subscriptionDiscount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={serviceRates.subscriptionDiscount}
                onChange={handleChange}
                placeholder="e.g. 20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minHours">Minimum Hours (1-12)</Label>
              <Input
                id="minHours"
                name="minHours"
                type="number"
                min="1"
                max="12"
                required
                value={serviceRates.minHours}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCleaners">Maximum Cleaners (1-10)</Label>
              <Input
                id="maxCleaners"
                name="maxCleaners"
                type="number"
                min="1"
                max="10"
                required
                value={serviceRates.maxCleaners}
                onChange={handleChange}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full md:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Configuration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceRatesTab;