import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ServiceForm from '@/components/AdminDashboard/ServiceForm';
import { createProduct } from '@/lib/storage/productStorage';

const AdminCreateServicePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (productData, selectedAddonTemplateIds) => {
    setIsLoading(true);
    try {
      const newProduct = await createProduct(productData, selectedAddonTemplateIds);
      toast({ title: "Product Created", description: `Successfully created product: ${newProduct.name}` });
      navigate('/admin-dashboard/manage-services');
    } catch (error) {
      toast({ title: "Error", description: `Failed to create product: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              Create New Service/Product
            </CardTitle>
            <CardDescription className="text-slate-400">
              Fill in the details below to add a new offering to your catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceForm 
              onSubmit={handleFormSubmit} 
              isLoading={isLoading}
              submitButtonText="Create Service/Product"
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminCreateServicePage;