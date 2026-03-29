import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, PlusCircle, Edit3, Trash2, Loader2, PackagePlus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAddonTemplates, createAddonTemplate, updateAddonTemplate, deleteAddonTemplate } from '@/lib/storage/productStorage';
import PermissionGate from '@/components/PermissionGate';

const ManageAddonsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addons, setAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    is_active: true
  });

  const loadAddons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAddons = await fetchAddonTemplates();
      setAddons(fetchedAddons || []);
    } catch (err) {
      console.error("Error loading addons:", err);
      setError("Failed to load addons. Please try again.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  const handleBack = () => {
    navigate('/admin-dashboard/manage-services');
  };

  const handleCreateNew = () => {
    setSelectedAddon(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      is_active: true
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = (addon) => {
    setSelectedAddon(addon);
    setFormData({
      name: addon.name || '',
      description: addon.description || '',
      price: addon.price?.toString() || '',
      is_active: addon.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (addon) => {
    setSelectedAddon(addon);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = async (addon) => {
    const newStatus = !addon.is_active;
    try {
      await updateAddonTemplate(addon.id, { is_active: newStatus });
      setAddons(prevAddons =>
        prevAddons.map(a =>
          a.id === addon.id ? { ...a, is_active: newStatus } : a
        )
      );
      toast({
        title: "Status Updated",
        description: `${addon.name} is now ${newStatus ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update status: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      toast({ title: "Validation Error", description: "Valid price is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const addonData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        is_active: formData.is_active
      };

      if (selectedAddon) {
        // Update existing
        const updated = await updateAddonTemplate(selectedAddon.id, addonData);
        setAddons(prevAddons =>
          prevAddons.map(a => a.id === selectedAddon.id ? { ...a, ...updated } : a)
        );
        toast({ title: "Success", description: "Addon updated successfully." });
      } else {
        // Create new
        const created = await createAddonTemplate(addonData);
        setAddons(prevAddons => [created, ...prevAddons]);
        toast({ title: "Success", description: "Addon created successfully." });
      }
      setIsEditModalOpen(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAddon) return;
    
    setIsSaving(true);
    try {
      await deleteAddonTemplate(selectedAddon.id);
      setAddons(prevAddons => prevAddons.filter(a => a.id !== selectedAddon.id));
      toast({ title: "Success", description: "Addon deleted successfully." });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const AddonRow = ({ addon, index }) => (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="hover:bg-slate-800/50"
    >
      <TableCell className="font-medium text-slate-200">{addon.name}</TableCell>
      <TableCell className="text-slate-400 max-w-[200px] truncate">{addon.description || '-'}</TableCell>
      <TableCell className="text-slate-300">BHD {parseFloat(addon.price || 0).toFixed(3)}</TableCell>
      <TableCell>
        <Badge 
          variant={addon.is_active !== false ? "default" : "destructive"} 
          className={addon.is_active !== false ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
        >
          {addon.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-400">Active</span>
            <Switch
              checked={addon.is_active !== false}
              onCheckedChange={() => handleToggleActive(addon)}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
              aria-label={`Toggle active status for ${addon.name}`}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEdit(addon)} 
            className="border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
          >
            <Edit3 className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDeleteClick(addon)} 
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </motion.tr>
  );

  return (
    <div className="p-4 sm:p-6 bg-slate-900 min-h-screen">
      <Card className="bg-slate-800/70 border-slate-700 shadow-2xl backdrop-blur-md text-slate-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
                Manage Addon Templates
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                View, create, edit, activate/deactivate addon templates.
              </CardDescription>
            </div>
          </div>
          <PermissionGate permission="addons_templates.create">
            <Button 
              onClick={handleCreateNew} 
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            >
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Addon
            </Button>
          </PermissionGate>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-red-500/50 rounded-lg bg-red-500/10 p-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-xl font-semibold text-red-300">Error Loading Addons</p>
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <Button onClick={loadAddons} variant="destructive">Try Again</Button>
            </div>
          ) : addons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/50">
              <PackagePlus className="w-16 h-16 text-slate-600 mb-4" />
              <p className="text-lg font-semibold text-slate-500">No Addon Templates Found</p>
              <p className="text-sm text-slate-600 mb-4">Get started by creating a new addon template.</p>
              <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Addon
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Description</TableHead>
                    <TableHead className="text-slate-400">Price</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {addons.map((addon, index) => (
                      <AddonRow key={addon.id} addon={addon} index={index} />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-300">
              {selectedAddon ? 'Edit Addon Template' : 'Create New Addon Template'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedAddon ? 'Update the addon details below.' : 'Fill in the details for the new addon.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Deep Cleaning"
                className="bg-slate-700 border-slate-600 text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                className="bg-slate-700 border-slate-600 text-slate-200"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-slate-300">Price (BHD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.000"
                className="bg-slate-700 border-slate-600 text-slate-200"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active" className="text-slate-300">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedAddon ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Addon Template</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete "{selectedAddon?.name}"? This action cannot be undone.
              Any products linked to this addon will have the link removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageAddonsPage;
