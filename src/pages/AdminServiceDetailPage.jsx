import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, updateBooking, updateAssignedEmployees, updateBookingServiceStatus, cancelBooking, refundBooking } from '@/lib/storage/bookingStorage';
import { getEmployees } from '@/lib/storage/employeeStorage';
import { findUserByEmail, findUserById } from '@/lib/storage/userStorage';
import { services, personalSubscriptionPlans, businessSubscriptionPlans } from '@/lib/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import ServiceInfoDisplay from '@/components/AdminServiceDetail/ServiceInfoDisplay';
import CustomerInfoDisplay from '@/components/AdminServiceDetail/CustomerInfoDisplay';
import ServiceStatusControl from '@/components/AdminServiceDetail/ServiceStatusControl';
import EmployeeAssignmentControl from '@/components/AdminServiceDetail/EmployeeAssignmentControl';
import ServiceActions from '@/components/AdminServiceDetail/ServiceActions';
import EditableServiceDetails from '@/components/AdminServiceDetail/EditableServiceDetails';
import { Badge } from "@/components/ui/badge";

const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': return 'success';
        case 'in-progress': return 'default';
        case 'scheduled': return 'outline';
        case 'pending': return 'secondary';
        case 'cancelled': return 'destructive';
        case 'quote requested': return 'secondary';
        case 'refunded': return 'destructive';
        default: return 'secondary';
    }
};

const AdminServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bookingData = await getBookingById(id);
      if (bookingData) {
        setBooking(bookingData);
        const customer = bookingData.user_id ? await findUserById(bookingData.user_id) : await findUserByEmail(bookingData.contact_email);
        setUser(customer);
        // Ensure displayed date is consistent with wall clock time by using local components or stripping offset
        // Here we use string splitting for consistency with storage format
        setEditFormData({
          date: bookingData.booking_date ? new Date(bookingData.booking_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '')).toISOString().split('T')[0] : '',
          time: bookingData.booking_date ? new Date(bookingData.booking_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          address: bookingData.contact_address?.street || '', 
        });
      } else {
        toast({ title: "Error", description: "Booking not found.", variant: "destructive" });
        navigate('/admin-dashboard/services');
      }
      const employeesData = await getEmployees();
      setAllEmployees(employeesData);
    } catch (error) {
      toast({ title: "Error", description: `Failed to fetch data: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (newStatus) => {
     try {
        await updateBookingServiceStatus(id, newStatus);
        toast({ title: "Success", description: "Service status updated." });
        fetchData();
    } catch (error) {
        toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
    }
  };

  const handleUpdateAssignedEmployees = async (selectedEmployeeIds) => {
     try {
        await updateAssignedEmployees(id, selectedEmployeeIds);
        toast({ title: "Success", description: "Assigned employees updated." });
        fetchData();
    } catch (error) {
        toast({ title: "Error", description: `Failed to update assignments: ${error.message}`, variant: "destructive" });
    }
  };

   const handleCancelBookingAction = async () => {
    if (window.confirm("Are you sure you want to cancel this service booking?")) {
      try {
        await cancelBooking(id);
        toast({ title: "Booking Cancelled", description: `Booking Ref ${id.substring(0, 6)} has been cancelled.` });
        fetchData();
      } catch (error) {
        toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" });
      }
    }
  };

  const handleRefundBookingAction = async () => {
     if (window.confirm("Are you sure you want to refund this purchase? This action cannot be undone.")) {
       try {
         await refundBooking(id);
         toast({ title: "Booking Refunded", description: `Booking Ref ${id.substring(0, 6)} has been marked as refunded.` });
         fetchData();
       } catch (error) {
         toast({ title: "Error", description: "Could not process refund.", variant: "destructive" });
       }
     }
  };

  const handleEditSave = async () => {
      try {
          const [hours, minutes] = editFormData.time.split(':');
          const dateObj = new Date(editFormData.date);
          dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));
          
          const dataToSave = {
              booking_date: dateObj.toISOString(),
              contact_address: { ...booking.contact_address, street: editFormData.address }
          };
          await updateBooking(id, dataToSave);
          toast({ title: "Success", description: "Booking details updated." });
          fetchData();
      } catch (error) {
          toast({ title: "Error", description: `Failed to save changes: ${error.message}`, variant: "destructive" });
      }
  };

  const handleEditCancel = () => {
      setEditFormData({
          date: booking?.booking_date ? new Date(booking.booking_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '')).toISOString().split('T')[0] : '',
          time: booking?.booking_date ? new Date(booking.booking_date.replace(/(Z|[+-]\d{2}:?\d{2})$/, '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          address: booking?.contact_address?.street || '',
      });
      setIsEditing(false);
  };

  if (loading) {
    return <div className="p-6">Loading service details...</div>;
  }

  if (!booking) {
    return <div className="p-6">Booking not found.</div>;
  }

   const getServiceName = (serviceId) => services.find(s => s.id === serviceId)?.name || 'N/A';
   const getPlanName = (planId, planCategory) => {
     if (!planId) return 'Single Cleaning';
     const plans = planCategory === 'business' ? businessSubscriptionPlans : personalSubscriptionPlans;
     return plans.find(p => p.id === planId)?.name || 'Unknown Plan';
   };

  const isActionDisabled = booking.status === 'cancelled' || booking.status === 'refunded' || booking.service_status === 'Cancelled' || booking.service_status === 'Refunded' || booking.service_status === 'Completed';

  return (
    <div className="p-6 space-y-6">
       <div className="flex justify-between items-center">
           <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Services List
            </Button>
            {!isEditing ? (
                 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isActionDisabled}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                </Button>
            ) : (
                 <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={handleEditCancel}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleEditSave}>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                 </div>
            )}
       </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="text-2xl">Service Details - Ref: <span className="font-mono">{booking.reference_number ? booking.reference_number.substring(0, 6) : booking.id.substring(0,6)}</span></CardTitle>
                  <CardDescription>
                      {getServiceName(booking.service_type)} ({getPlanName(booking.service_details?.planId, booking.service_details?.planCategory)})
                  </CardDescription>
              </div>
               <Badge variant={getStatusBadgeVariant(booking.service_status)} className="text-lg px-4 py-1 capitalize">
                 {booking.service_status || 'Unknown'}
               </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="md:col-span-2 space-y-4">
                <CustomerInfoDisplay booking={booking} user={user} />
                {isEditing ? (
                    <EditableServiceDetails
                        formData={editFormData}
                        setFormData={setEditFormData}
                    />
                ) : (
                    <ServiceInfoDisplay booking={booking} />
                )}
            </div>

             <div className="space-y-6 md:col-span-1">
                 <ServiceStatusControl
                    currentStatus={booking.service_status}
                    onUpdateStatus={handleUpdateStatus}
                    disabled={isActionDisabled || isEditing}
                 />
                 <EmployeeAssignmentControl
                    allEmployees={allEmployees}
                    assignedEmployeeIds={booking.assigned_employee_ids || []}
                    onUpdateAssignments={handleUpdateAssignedEmployees}
                    disabled={isActionDisabled || isEditing}
                 />
                 <ServiceActions
                    booking={booking}
                    onCancel={handleCancelBookingAction}
                    onRefund={handleRefundBookingAction}
                    disabled={isActionDisabled || isEditing}
                 />
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminServiceDetailPage;