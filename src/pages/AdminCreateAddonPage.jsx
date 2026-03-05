import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, PlusCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createAddonTemplate } from '@/lib/storage/productStorage';

const AdminCreateAddonPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');
  const [isAddonRequired, setIsAddonRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!addonName.trim() || addonPrice === '') {
      toast({ title: "Error", description: "Addon Name and Price are required.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const addonTemplateData = {
        name: addonName.trim(),
        price: parseFloat(addonPrice),
        is_required: isAddonRequired,
      };

      const newAddonTemplate = await createAddonTemplate(addonTemplateData);
      toast({ title: "Addon Template Created", description: `Successfully created addon template: ${newAddonTemplate.name}` });
      
      setAddonName('');
      setAddonPrice('');
      setIsAddonRequired(false);
      navigate('/admin-dashboard/manage-services'); 

    } catch (error) {
      toast({ title: "Error", description: `Failed to create addon template: ${error.message}`, variant: "destructive" });
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
      <div className="max-w-xl mx-auto">
        <Button
            variant="outline"
            onClick={() => navigate('/admin-dashboard/manage-services')}
            className="mb-6 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Services
        </Button>

        <Card className="bg-slate-800/70 border-slate-700 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Create New Addon Template
            </CardTitle>
            <CardDescription className="text-slate-400">
              Define reusable addon templates that can be applied to services/products via linking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="addonName" className="text-slate-300">Addon Name</Label>
                <Input
                  id="addonName"
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                  placeholder="e.g., Premium Fabric Protection"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addonPrice" className="text-slate-300">Price ($)</Label>
                <Input
                  id="addonPrice"
                  type="number"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  placeholder="e.g., 29.99"
                  required
                  min="0"
                  step="0.01"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-indigo-500"
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isAddonRequired"
                  checked={isAddonRequired}
                  onCheckedChange={setIsAddonRequired}
                  className="border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <Label htmlFor="isAddonRequired" className="text-slate-300 cursor-pointer">
                  This addon is required (when linked to a product)
                </Label>
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 text-base disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Creating...' : 'Create Addon Template'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminCreateAddonPage;