import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea exists

const EditableServiceDetails = ({ formData, setFormData }) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4 border p-4 rounded-md bg-blue-50/30">
        <h3 className="font-semibold text-lg border-b pb-2 text-blue-700">Editing Service Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                    id="edit-date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                />
            </div>
            <div>
                <Label htmlFor="edit-time">Time</Label>
                <Input
                    id="edit-time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                />
            </div>
        </div>
        <div>
            <Label htmlFor="edit-address">Address</Label>
            {/* Use Textarea if address can be long, otherwise Input */}
             <Textarea
                id="edit-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
            />
            {/* <Input
                id="edit-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
            /> */}
        </div>
        {/* Add other editable fields here as needed */}
        {/* Example:
         <div>
            <Label htmlFor="edit-notes">Admin Notes</Label>
            <Textarea
                id="edit-notes"
                name="adminNotes"
                value={formData.adminNotes || ''}
                onChange={handleChange}
                rows={3}
            />
        </div>
        */}
    </div>
  );
};

export default EditableServiceDetails;