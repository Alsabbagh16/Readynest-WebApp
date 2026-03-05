import React, { useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Clock } from "lucide-react";
import { validateBookingTime } from "@/lib/timeWindowValidator";
import { cn } from "@/lib/utils";

/**
 * Reusable TimePickerInput component that encapsulates validation logic.
 * 
 * @param {Object} props
 * @param {string} props.id - ID for the input
 * @param {string} props.label - Label text
 * @param {string} props.value - DateTime string (ISO format preferred for datetime-local)
 * @param {Function} props.onChange - Handler for value changes
 * @param {string} [props.min] - Minimum date/time
 * @param {string} [props.className] - Additional classes
 * @param {boolean} [props.required] - Is input required
 */
const TimePickerInput = ({ 
  id, 
  label, 
  value, 
  onChange, 
  min, 
  className,
  required = false 
}) => {
  
  const validation = useMemo(() => {
    if (!value) return { isValid: true, error: null };
    return validateBookingTime(value);
  }, [value]);

  const handleChange = (e) => {
    onChange(e);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {label}
            {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Input 
          id={id}
          type="datetime-local"
          min={min}
          value={value}
          onChange={handleChange}
          aria-invalid={!validation.isValid}
          className={cn(
            "h-12 text-lg dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:[color-scheme:dark]",
            !validation.isValid && value ? "border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-900/10" : ""
          )}
      />
      {!validation.isValid && value && (
          <p className="text-sm text-red-500 flex items-center mt-1 animate-in slide-in-from-top-1 fade-in duration-200">
              <AlertCircle className="h-3 w-3 mr-1" /> {validation.error}
          </p>
      )}
    </div>
  );
};

export default TimePickerInput;