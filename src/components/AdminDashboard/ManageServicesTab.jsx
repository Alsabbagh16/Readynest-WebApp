import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Edit3, PackagePlus, Loader2, ImageOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProductsWithCategories, updateProduct } from '@/lib/storage/productStorage';
import PermissionGate from '@/components/PermissionGate';

const ManageServicesTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProducts = await fetchProductsWithCategories();
      setProducts(fetchedProducts);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Failed to load services. Please try again.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreateService = () => {
    navigate('/admin-dashboard/manage-services/create-service');
  };

  const handleCreateAddon = () => {
    navigate('/admin-dashboard/manage-services/create-addon');
  };

  const handleEditService = (productId) => {
    navigate(`/admin-dashboard/manage-services/edit-service/${productId}`);
  };

  const handleToggleActive = async (product) => {
    const newIsActiveStatus = !product.isActive;
    try {
      await updateProduct(product.id, { isActive: newIsActiveStatus });
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === product.id ? { ...p, isActive: newIsActiveStatus } : p
        )
      );
      toast({
        title: "Status Updated",
        description: `${product.name} is now ${newIsActiveStatus ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update status for ${product.name}: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const ProductRow = ({ product, index }) => (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="hover:bg-slate-800/50"
    >
      <TableCell>
        {product.image_url ? (
          <img-replace src={product.image_url} alt={product.name} className="h-12 w-12 object-cover rounded-md shadow-sm" />
        ) : (
          <div className="h-12 w-12 bg-slate-700 rounded-md flex items-center justify-center">
            <ImageOff className="h-6 w-6 text-slate-500" />
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium text-slate-200">{product.name}</TableCell>
      <TableCell className="text-slate-400">{product.categories?.name || 'N/A'}</TableCell>
      <TableCell className="text-slate-300">${parseFloat(product.price).toFixed(2)}</TableCell>
      <TableCell className="text-slate-400">{product.type}</TableCell>
      <TableCell>
        <Badge variant={product.isActive ? "default" : "destructive"} className={product.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-right space-x-2">
        <PermissionGate permission="products.create">
            <Switch
            checked={product.isActive}
            onCheckedChange={() => handleToggleActive(product)}
            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
            aria-label={`Toggle active status for ${product.name}`}
            />
            <Button variant="outline" size="sm" onClick={() => handleEditService(product.id)} className="border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
            <Edit3 className="mr-1 h-4 w-4" /> Edit
            </Button>
        </PermissionGate>
      </TableCell>
    </motion.tr>
  );

  return (
    <div className="p-4 sm:p-6 bg-slate-900 min-h-full">
      <Card className="bg-slate-800/70 border-slate-700 shadow-2xl backdrop-blur-md text-slate-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              Manage Services & Products
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              View, create, edit, and manage all services and products.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <PermissionGate permission="addons_templates.create">
                <Button onClick={handleCreateAddon} variant="outline" className="w-full sm:w-auto bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/50">
                <PackagePlus className="mr-2 h-5 w-5" /> Create Addon Template
                </Button>
            </PermissionGate>
            <PermissionGate permission="products.create">
                <Button onClick={handleCreateService} className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Service
                </Button>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-sky-400 animate-spin" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-red-500/50 rounded-lg bg-red-500/10 p-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-xl font-semibold text-red-300">Error Loading Services</p>
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <Button onClick={loadProducts} variant="destructive">Try Again</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/50">
              <svg
                className="w-16 h-16 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                ></path>
              </svg>
              <p className="mt-4 text-lg font-semibold text-slate-500">
                No Services Found
              </p>
              <p className="text-sm text-slate-600">
                Get started by creating a new service or product.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-400 w-[80px]">Image</TableHead>
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Category</TableHead>
                    <TableHead className="text-slate-400">Price</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {products.map((product, index) => (
                      <ProductRow key={product.id} product={product} index={index} />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageServicesTab;