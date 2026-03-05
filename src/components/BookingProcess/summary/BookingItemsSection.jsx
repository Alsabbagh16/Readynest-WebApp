import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Home, Building, Calendar, CheckSquare, Sparkles, Tag, RefreshCw, CalendarClock } from 'lucide-react';

const BookingItemsSection = ({ selections, addonTemplates, selectedAddons, onAddonToggle, matchedProduct }) => {
  const getSelectionText = (key, value, propertyType) => {
    if (!value) return 'Not Selected';
    switch (key) {
      case 'propertyType':
        return value === 'home' ? 'My Home' : value === 'airbnb' ? 'My Airbnb Rentals' : value;
      case 'homeSize':
        if (propertyType === 'home') {
          if (value === 'small') return 'Small House';
          if (value === 'medium') return 'Medium House';
          if (value === 'large') return 'Large House';
        } else if (propertyType === 'airbnb') {
          if (value === 'small') return 'Studio / 1 Bedroom';
          if (value === 'medium') return '2 Bedrooms';
          if (value === 'large') return '3 Bedrooms+';
        }
        return value;
      case 'cleaningType':
        if (propertyType === 'home') {
          return value === 'one-time' ? 'A One Time Service' : value === 'recurring' ? 'Weekly Subscription' : value;
        } else if (propertyType === 'airbnb') {
          return value === 'one-time' ? 'Turnover Clean' : value === 'recurring' ? 'Weekly Recurring Clean' : value;
        }
        return value;
      default:
        return value;
    }
  };

  const selectionDetails = [
    { 
      key: 'propertyType', 
      label: 'Property Type', 
      icon: selections.propertyType === 'home' ? Home : Building, 
      value: getSelectionText('propertyType', selections.propertyType, selections.propertyType) 
    },
    { 
      key: 'homeSize', 
      label: selections.propertyType === 'airbnb' ? 'Apartment Size' : 'House Size', 
      icon: CheckSquare, 
      value: getSelectionText('homeSize', selections.homeSize, selections.propertyType) 
    },
    { 
      key: 'cleaningType', 
      label: 'Frequency', 
      icon: selections.propertyType === 'airbnb' ? (selections.cleaningType === 'one-time' ? RefreshCw : CalendarClock) : Calendar, 
      value: getSelectionText('cleaningType', selections.cleaningType, selections.propertyType) 
    }
  ].filter(detail => selections[detail.key]); // Only show selected items

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-semibold text-foreground mb-3 flex items-center dark:text-white">
          <Sparkles className="h-5 w-5 mr-2 text-primary dark:text-sky-400" /> Your Service Selections
        </h4>
        <Card className="bg-background/70 dark:bg-slate-700/50 dark:border-slate-600">
          <CardContent className="p-4 space-y-3">
            {selectionDetails.map(detail => (
              <div key={detail.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center text-muted-foreground dark:text-slate-400">
                  <detail.icon className="h-4 w-4 mr-2 text-primary dark:text-sky-400" /> {detail.label}:
                </span>
                <span className="font-medium text-foreground dark:text-white">{detail.value}</span>
              </div>
            ))}
            {matchedProduct && (
               <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-border dark:border-slate-600">
                <span className="flex items-center text-muted-foreground dark:text-slate-400">
                  <Tag className="h-4 w-4 mr-2 text-primary dark:text-sky-400" /> Service Package:
                </span>
                <span className="font-medium text-foreground dark:text-white">{matchedProduct.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {addonTemplates && addonTemplates.length > 0 && (
        <div>
          <h4 className="text-xl font-semibold text-foreground mb-3 flex items-center dark:text-white">
            <CheckSquare className="h-5 w-5 mr-2 text-primary dark:text-sky-400" /> Optional Addons
          </h4>
          <Card className="bg-background/70 dark:bg-slate-700/50 dark:border-slate-600">
            <CardContent className="p-4 space-y-3">
              {addonTemplates.map((addon) => (
                <div key={addon.id} className="flex items-center justify-between">
                  <Label htmlFor={`addon-${addon.id}`} className="flex items-center text-sm font-medium text-foreground dark:text-white cursor-pointer">
                    <Checkbox
                      id={`addon-${addon.id}`}
                      checked={selectedAddons.includes(addon.id)}
                      onCheckedChange={() => onAddonToggle(addon.id)}
                      className="mr-3 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:border-sky-400 dark:data-[state=checked]:bg-sky-400"
                    />
                    {addon.name}
                  </Label>
                  <span className="text-sm text-muted-foreground dark:text-slate-400">${Number(addon.price).toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BookingItemsSection;