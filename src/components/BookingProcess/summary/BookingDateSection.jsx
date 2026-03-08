import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarClock, MessageSquare } from 'lucide-react';

const BookingDateSection = ({ 
  bookingDate, 
  onBookingDateChange, 
  additionalBookingDates, 
  onAdditionalBookingDateChange, 
  cleaningType,
  specialInstructions,
  onSpecialInstructionsChange
}) => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  const minDateTime = localIso;

  return (
    <Card className="border-primary/20 dark:border-primary/20 overflow-hidden">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center text-primary dark:text-sky-400">
          <CalendarClock className="mr-2 h-5 w-5" /> Preferred Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="summary-date1" className="text-sm font-medium">Primary Date & Time</Label>
            <Input
              id="summary-date1"
              type="datetime-local"
              value={bookingDate || ''}
              onChange={(e) => onBookingDateChange(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />
          </div>

          {cleaningType === 'recurring' && additionalBookingDates && (
            <>
              <div className="space-y-2">
                <Label htmlFor="summary-date2" className="text-sm font-medium">2nd Appointment</Label>
                <Input
                  id="summary-date2"
                  type="datetime-local"
                  value={additionalBookingDates.date2 || ''}
                  onChange={(e) => onAdditionalBookingDateChange('date2', e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary-date3" className="text-sm font-medium">3rd Appointment</Label>
                <Input
                  id="summary-date3"
                  type="datetime-local"
                  value={additionalBookingDates.date3 || ''}
                  onChange={(e) => onAdditionalBookingDateChange('date3', e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary-date4" className="text-sm font-medium">4th Appointment</Label>
                <Input
                  id="summary-date4"
                  type="datetime-local"
                  value={additionalBookingDates.date4 || ''}
                  onChange={(e) => onAdditionalBookingDateChange('date4', e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="special-instructions" className="text-sm font-medium flex items-center gap-2">
             <MessageSquare className="h-4 w-4" /> Special Instructions (Optional)
          </Label>
          <Textarea 
            id="special-instructions" 
            placeholder="Any specific requests? (e.g., 'Please use the side door', 'Watch out for the cat')"
            className="bg-white dark:bg-slate-800 resize-none h-24"
            value={specialInstructions || ''}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingDateSection;