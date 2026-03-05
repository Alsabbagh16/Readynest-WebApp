import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const HomeSizeSelection = ({ homeSize, setHomeSize }) => {
  return (
    <div>
      <Label className="mb-2 block">Home Size</Label>
      <RadioGroup
        value={homeSize}
        onValueChange={setHomeSize}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="small" id="small" />
          <Label htmlFor="small" className="cursor-pointer font-normal">Small (up to 1,500 sq ft)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="medium" />
          <Label htmlFor="medium" className="cursor-pointer font-normal">Medium (1,500-2,500 sq ft)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="large" id="large" />
          <Label htmlFor="large" className="cursor-pointer font-normal">Large (2,500+ sq ft)</Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default HomeSizeSelection;