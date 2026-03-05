import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

const DateTimeSelection = ({ date, setDate, time, setTime, errors }) => {
  const today = new Date().toISOString().split("T")[0];

  const validTimes = [
    "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", 
    "15:30", "16:00", "16:30", "17:00"
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
          required
          className={errors?.date ? "border-red-500" : ""}
        />
        {errors?.date && <p className="text-red-500 text-xs">{errors.date}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Time
        </Label>
        <Select
          value={time}
          onValueChange={setTime}
          required
        >
          <SelectTrigger id="time" className={errors?.time ? "border-red-500" : ""}>
            <SelectValue placeholder="Select a time" />
          </SelectTrigger>
          <SelectContent>
            {validTimes.map((t) => (
                <SelectItem key={t} value={t}>
                    {t} {parseInt(t.split(':')[0]) < 12 ? 'AM' : 'PM'}
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
         {errors?.time && <p className="text-red-500 text-xs">{errors.time}</p>}
      </div>
    </div>
  );
};

export default DateTimeSelection;