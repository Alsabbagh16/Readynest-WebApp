import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Power, PowerOff, Search, Loader2, Tag, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import CouponForm from './CouponForm';
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } from '@/lib/couponUtils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import PermissionGate from '@/components/PermissionGate';

const CouponsTab = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState(null);
  const { toast } = useToast();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await getAllCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coupons',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setIsDialogOpen(true);
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setIsDialogOpen(true);
  };

  const handleSubmitCoupon = async (couponData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (editingCoupon) {
        result = await updateCoupon(editingCoupon.id, couponData);
      } else {
        result = await createCoupon({
          ...couponData,
          created_by: adminUser?.id
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Coupon ${editingCoupon ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        setEditingCoupon(null);
        fetchCoupons();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save coupon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      const result = await toggleCouponStatus(couponId, !currentStatus);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Coupon ${!currentStatus ? 'activated' : 'deactivated'} successfully`
        });
        fetchCoupons();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update coupon status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    try {
      const result = await deleteCoupon(couponId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Coupon deleted successfully'
        });
        setDeletingCouponId(null);
        fetchCoupons();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete coupon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUsageDisplay = (coupon) => {
    if (!coupon.max_uses) return `${coupon.used_count} / Unlimited`;
    return `${coupon.used_count} / ${coupon.max_uses}`;
  };

  const getUsagePercentage = (coupon) => {
    if (!coupon.max_uses) return 0;
    return (coupon.used_count / coupon.max_uses) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coupons Management</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount coupons</p>
        </div>
        <PermissionGate permission="coupons.create">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreateCoupon}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Coupon
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                <DialogTitle>
                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </DialogTitle>
                </DialogHeader>
                <CouponForm
                initialData={editingCoupon}
                onSubmit={handleSubmitCoupon}
                onCancel={() => setIsDialogOpen(false)}
                isSubmitting={isSubmitting}
                />
            </DialogContent>
            </Dialog>
        </PermissionGate>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredCoupons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {searchTerm ? 'No coupons found matching your search' : 'No coupons created yet'}
          </p>
          {!searchTerm && (
            <PermissionGate permission="coupons.create">
                <Button onClick={handleCreateCoupon} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Coupon
                </Button>
            </PermissionGate>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Per-User Limit</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => {
                const usagePercentage = getUsagePercentage(coupon);
                const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                const isNotYetValid = coupon.valid_from && new Date(coupon.valid_from) > new Date();

                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm font-semibold">
                          {coupon.code}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {coupon.type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {coupon.type === 'percentage' 
                        ? `${coupon.value}%` 
                        : `BD ${Number(coupon.value).toFixed(2)}`
                      }
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isNotYetValid ? (
                        <Badge variant="secondary">Not Yet Active</Badge>
                      ) : coupon.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{getUsageDisplay(coupon)}</div>
                        {coupon.max_uses && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                usagePercentage >= 100 ? 'bg-red-500' : 
                                usagePercentage >= 75 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.max_uses_per_user || 'Unlimited'}
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until 
                        ? format(new Date(coupon.valid_until), 'MMM d, yyyy')
                        : 'No expiry'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate permission="coupons.create">
                            <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                            title={coupon.is_active ? 'Deactivate' : 'Activate'}
                            >
                            {coupon.is_active ? (
                                <PowerOff className="h-4 w-4 text-orange-600" />
                            ) : (
                                <Power className="h-4 w-4 text-green-600" />
                            )}
                            </Button>
                            <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCoupon(coupon)}
                            >
                            <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog 
                            open={deletingCouponId === coupon.id} 
                            onOpenChange={(open) => !open && setDeletingCouponId(null)}
                            >
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingCouponId(coupon.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete coupon <strong>{coupon.code}</strong>? 
                                    This action cannot be undone and will also delete all redemption records.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CouponsTab;