
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Plus } from 'lucide-react';

const SavedAddressSelector = ({ selectedAddressId, onSelect, onAddNew, onAddressPhoneChange }) => {
  const { addresses, user } = useAuth();

  useEffect(() => {
    if (selectedAddressId && addresses) {
      const addr = addresses.find(a => a.id === selectedAddressId);
      if (onAddressPhoneChange) {
        onAddressPhoneChange(addr?.phone || '');
      }
    }
  }, [selectedAddressId, addresses, onAddressPhoneChange]);

  if (!user) {
    return (
      <div className="text-center p-6 bg-muted/30 rounded-lg border border-border">
        <p className="text-muted-foreground mb-4">Please log in to use saved addresses.</p>
        <Button onClick={onAddNew} variant="outline">Enter Address Manually</Button>
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/30 rounded-lg border border-border">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">You don't have any saved addresses yet.</p>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedAddressId || ''} onValueChange={onSelect} className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id}>
            <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="peer sr-only" />
            <Label
              htmlFor={`addr-${addr.id}`}
              className="flex flex-col cursor-pointer rounded-lg border border-border bg-card p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary transition-all"
            >
              <div className="flex items-center gap-3">
                <MapPin className={`h-5 w-5 ${selectedAddressId === addr.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground">
                    {addr.label || 'Saved Address'} {addr.is_default && <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded ml-2">Default</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {addr.street}, {addr.city} {addr.zip || addr.zip_code}
                  </p>
                  {addr.phone && (
                    <p className="text-xs text-muted-foreground mt-1">Phone: {addr.phone}</p>
                  )}
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
      
      <Button variant="outline" onClick={onAddNew} className="w-full mt-2 border-dashed">
        <Plus className="mr-2 h-4 w-4" /> Enter a Different Address
      </Button>
    </div>
  );
};

export default SavedAddressSelector;
