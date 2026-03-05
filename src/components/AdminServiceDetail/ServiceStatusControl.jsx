import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ServiceStatusControl = ({ currentStatus, onUpdateStatus, disabled }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'Pending');
  const serviceStatuses = ['Pending', 'Scheduled', 'In-Progress', 'Completed', 'Cancelled'];

  const handleUpdateClick = () => {
      if (selectedStatus !== currentStatus) {
          onUpdateStatus(selectedStatus);
      }
  };

  return (
    <div className="space-y-2">
        <Label htmlFor="update-status">Update Service Status</Label>
         <div className="flex gap-2">
            <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={disabled}
            >
              <SelectTrigger id="update-status">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {serviceStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
                onClick={handleUpdateClick}
                disabled={disabled || selectedStatus === currentStatus}
                size="sm"
            >
                Update
            </Button>
        </div>
    </div>
  );
};

export default ServiceStatusControl;