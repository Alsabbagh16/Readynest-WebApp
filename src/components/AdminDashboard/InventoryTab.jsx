import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Search, Loader2, Package, FolderPlus, AlertTriangle, Truck, Phone, Mail } from 'lucide-react';
import InventoryForm from './InventoryForm';
import SupplierForm from './SupplierForm';
import {
  getAllInventoryItems,
  getAllInventoryCategories,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  getAllInventorySuppliers,
  createInventorySupplier,
  updateInventorySupplier,
  deleteInventorySupplier
} from '@/lib/storage/inventoryStorage';
import PermissionGate from '@/components/PermissionGate';
import { usePermissionContext } from '@/contexts/PermissionContext';

const LOW_STOCK_THRESHOLD = 5;

const CategoryBadge = ({ category, onEdit }) => {
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  
  const canEdit = isSuperadmin || !hasUiRoles || hasPerm('inventory.edit_category');
  
  if (!category) {
    return (
      <Badge variant="secondary" className="font-normal text-gray-400">
        Uncategorized
      </Badge>
    );
  }
  
  if (canEdit) {
    return (
      <Badge 
        variant="secondary" 
        className="font-normal cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => onEdit(category)}
      >
        {category.name}
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="font-normal">
      {category.name}
    </Badge>
  );
};

const InventoryTab = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('stock');
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData, suppliersData] = await Promise.all([
        getAllInventoryItems(),
        getAllInventoryCategories(),
        getAllInventorySuppliers()
      ]);
      setItems(itemsData || []);
      setCategories(categoriesData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      // If tables don't exist, show empty state instead of error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        setItems([]);
        setCategories([]);
        setSuppliers([]);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load inventory data. Please ensure database tables are created.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Item handlers
  const handleCreateItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleSubmitItem = async (itemData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (editingItem) {
        result = await updateInventoryItem(editingItem.id, itemData);
      } else {
        result = await createInventoryItem(itemData);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Item ${editingItem ? 'updated' : 'created'} successfully`
        });
        setIsItemDialogOpen(false);
        setEditingItem(null);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save item',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    
    try {
      const result = await deleteInventoryItem(deletingItemId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Item deleted successfully'
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete item',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSubmitCategory = async (categoryData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (editingCategory) {
        result = await updateInventoryCategory(editingCategory.id, categoryData);
      } else {
        result = await createInventoryCategory(categoryData);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Category ${editingCategory ? 'updated' : 'created'} successfully`
        });
        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save category',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    
    try {
      const result = await deleteInventoryCategory(deletingCategoryId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Category deleted successfully'
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete category',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Supplier handlers
  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierDialogOpen(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleSubmitSupplier = async (supplierData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (editingSupplier) {
        result = await updateInventorySupplier(editingSupplier.id, supplierData);
      } else {
        result = await createInventorySupplier(supplierData);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully`
        });
        setIsSupplierDialogOpen(false);
        setEditingSupplier(null);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save supplier',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplierId) return;
    
    try {
      const result = await deleteInventorySupplier(deletingSupplierId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Supplier deleted successfully'
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete supplier',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setDeletingSupplierId(null);
    }
  };

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_id?.toString() === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    return supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier.salesman?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const lowStockCount = items.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} items • {suppliers.length} suppliers • {categories.length} categories
            {lowStockCount > 0 && (
              <span className="text-amber-600 ml-2">
                • {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="inventory.create_supplier">
            <Button variant="outline" size="sm" onClick={handleCreateSupplier} className="gap-1.5">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">New</span> Supplier
            </Button>
          </PermissionGate>
          <PermissionGate permission="inventory.create_category">
            <Button variant="outline" size="sm" onClick={handleCreateCategory} className="gap-1.5">
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span> Category
            </Button>
          </PermissionGate>
          <PermissionGate permission="inventory.create_item">
            <Button size="sm" onClick={handleCreateItem} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span> Item
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No items found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Add your first inventory item to get started'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isLowStock = item.quantity < LOW_STOCK_THRESHOLD;
                    return (
                      <TableRow 
                        key={item.id} 
                        className={isLowStock ? 'bg-amber-50 hover:bg-amber-100' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge 
                            category={item.category} 
                            onEdit={handleEditCategory} 
                          />
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {item.size || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          BD {Number(item.cost).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {item.supplier?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate permission="inventory.edit_item">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="inventory.delete_item">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingItemId(item.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Suppliers Table */}
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No suppliers found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm 
                  ? 'Try adjusting your search' 
                  : 'Add your first supplier to get started'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Salesman</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} >
                        <TableCell className="font-medium">
                          <div>
                            {supplier.name}
                            <p className="hidden sm:block text-xs text-gray-400 mt-0.5">
                              {supplier.description || ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-600">
                          {supplier.salesman || '-'}
                        </TableCell>
                        <TableCell>
                          {supplier.mobile ? (
                            <a href={`tel:${supplier.mobile}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Phone className="h-3 w-3" />
                              <span className="hidden sm:inline">{supplier.mobile}</span>
                              <span className="sm:hidden">Call</span>
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {supplier.email ? (
                            <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate permission="inventory.edit_supplier">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSupplier(supplier)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="inventory.delete_supplier">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingSupplierId(supplier.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Create New Item'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm
            type="item"
            initialData={editingItem}
            categories={categories}
            suppliers={suppliers}
            onSubmit={handleSubmitItem}
            onCancel={() => {
              setIsItemDialogOpen(false);
              setEditingItem(null);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm
            type="category"
            initialData={editingCategory}
            onSubmit={handleSubmitCategory}
            onCancel={() => {
              setIsCategoryDialogOpen(false);
              setEditingCategory(null);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Create New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            initialData={editingSupplier}
            onSubmit={handleSubmitSupplier}
            onCancel={() => {
              setIsSupplierDialogOpen(false);
              setEditingSupplier(null);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={() => setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Categories with existing items cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Supplier Confirmation */}
      <AlertDialog open={!!deletingSupplierId} onOpenChange={() => setDeletingSupplierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supplier? Suppliers with existing items cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryTab;
