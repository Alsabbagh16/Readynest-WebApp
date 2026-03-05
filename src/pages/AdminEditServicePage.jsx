import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ServiceForm from '@/components/AdminDashboard/ServiceForm';
import { fetchProductById, updateProduct } from '@/lib/storage/productStorage';

const AdminEditServicePage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(true);
  const [productData, setProductData] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      setIsFetchingProduct(true);
      try {
        const data = await fetchProductById(productId);
        setProductData(data);
      } catch (error) {
        toast({ title: "Error", description: `Failed to fetch product details: ${error.message}`, variant: "destructive" });
        navigate('/admin-dashboard/manage-services');
      } finally {
        setIsFetchingProduct(false);
      }
    };
    loadProduct();
  }, [productId, toast, navigate]);

  const handleFormSubmit = async (updatedFormData, selectedAddonTemplateIds) => {
    setIsLoading(true);
    try {
      const productToUpdate = { ...updatedFormData };
      
      const updatedProduct = await updateProduct(productId, productToUpdate, selectedAddonTemplateIds);

      toast({ title: "Product Updated", description: `Successfully updated product: ${updatedProduct.name}` });
      navigate('/admin-dashboard/manage-services');
    } catch (error) {
      toast({ title: "Error", description: `Failed to update product: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!productData) {
     return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-8">
        <CardTitle className="text-2xl mb-4">Product Not Found</CardTitle>
        <CardDescription className="mb-6">The product you are trying to edit does not exist or could not be loaded.</CardDescription>
        <Button onClick={() => navigate('/admin-dashboard/manage-services')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Services
        </Button>
      </div>
    );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-3xl mx-auto">
        <Button
            variant="outline"
            onClick={() => navigate('/admin-dashboard/manage-services')}
            className="mb-6 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Services
        </Button>

        <Card className="bg-slate-800/70 border-slate-700 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Edit Service/Product
            </CardTitle>
            <CardDescription className="text-slate-400">
              Modify the details of: {productData.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceForm 
              initialData={productData}
              onSubmit={handleFormSubmit} 
              isLoading={isLoading}
              submitButtonText="Update Service/Product"
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminEditServicePage;