import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchCategories, createCategory as apiCreateCategory, fetchAddonTemplates } from '@/lib/storage/productStorage';

const productTypeOptions = [
  { value: "one_time_service", label: "One Time Service" },
  { value: "recurring_service", label: "Recurring Service" },
];

const propertyTypeOptions = [
  { value: "home", label: "Home" },
  { value: "airbnb", label: "Airbnb Rental" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const sizeOptions = [
  { value: "compact", label: "Compact" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "extra_large", label: "Extra Large" },
  { value: "n_a", label: "N/A (Not Applicable)" },
];


const ServiceForm = ({ initialData, onSubmit, isLoading, submitButtonText = "Submit" }) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [addonTemplates, setAddonTemplates] = useState([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialData?.category_id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [productName, setProductName] = useState(initialData?.name || '');
  
  const [productType, setProductType] = useState(initialData?.type || '');
  const [propertyType, setPropertyType] = useState(initialData?.property_type || '');
  const [size, setSize] = useState(initialData?.size || '');

  const [productDescription, setProductDescription] = useState(initialData?.description || '');
  const [productPrice, setProductPrice] = useState(initialData?.price || '');
  const [productValue, setProductValue] = useState(initialData?.value || '');
  const [productImageUrl, setProductImageUrl] = useState(initialData?.image_url || '');
  const [isActive, setIsActive] = useState(initialData?.isActive === undefined ? true : initialData.isActive);
  const [selectedAddonTemplateIds, setSelectedAddonTemplateIds] = useState([]);

  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [isFetchingAddons, setIsFetchingAddons] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsFetchingCategories(true);
      setIsFetchingAddons(true);
      try {
        const [fetchedCategories, fetchedAddonTemplates] = await Promise.all([
          fetchCategories(),
          fetchAddonTemplates()
        ]);
        setCategories(fetchedCategories);
        setAddonTemplates(fetchedAddonTemplates);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load initial form data.", variant: "destructive" });
      } finally {
        setIsFetchingCategories(false);
        setIsFetchingAddons(false);
      }
    };
    loadData();
  }, [toast]);

  useEffect(() => {
    if (initialData) {
      setSelectedCategoryId(initialData.category_id || initialData.categories?.id || '');
      setProductName(initialData.name || '');
      setProductType(initialData.type || '');
      setPropertyType(initialData.property_type || '');
      setSize(initialData.size || '');
      setProductDescription(initialData.description || '');
      setProductPrice(initialData.price || '');
      setProductValue(initialData.value || '');
      setProductImageUrl(initialData.image_url || '');
      setIsActive(initialData.isActive === undefined ? true : initialData.isActive);
      
      if (initialData.product_addon_links && initialData.product_addon_links.length > 0) {
        const initialSelectedIds = initialData.product_addon_links.map(link => link.addon_id);
        setSelectedAddonTemplateIds(initialSelectedIds);
      } else if (initialData.linked_addons && initialData.linked_addons.length > 0) {
         const initialSelectedIds = initialData.linked_addons.map(addon => addon.id);
         setSelectedAddonTemplateIds(initialSelectedIds);
      }
      else {
        setSelectedAddonTemplateIds([]);
      }
    }
  }, [initialData]);


  const handleAddonToggle = (templateId) => {
    setSelectedAddonTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const internalHandleSubmit = async (e) => {
    e.preventDefault();
    let categoryIdToUse = selectedCategoryId;

    if (selectedCategoryId === 'new_category' && newCategoryName.trim() !== '') {
      try {
        const newCategory = await apiCreateCategory(newCategoryName.trim());
        categoryIdToUse = newCategory.id;
        toast({ title: "Category Created", description: `Successfully created category: ${newCategory.name}` });
        setCategories(prev => [...prev, newCategory]);
        setSelectedCategoryId(newCategory.id);
        setNewCategoryName('');
      } catch (error) {
        toast({ title: "Error", description: `Failed to create category: ${error.message}`, variant: "destructive" });
        return;
      }
    } else if (selectedCategoryId === 'new_category' && newCategoryName.trim() === '') {
      toast({ title: "Error", description: "Please enter a name for the new category.", variant: "destructive" });
      return;
    }

    if (!categoryIdToUse) {
      toast({ title: "Error", description: "Please select or create a category.", variant: "destructive" });
      return;
    }
    
    if (!productName.trim() || !productType.trim() || !productPrice || productValue === '' || productValue === null || productValue === undefined || !propertyType.trim() || !size.trim()) {
      toast({ title: "Error", description: "Product Name, Type, Price, Value, Property Type, and Size are required.", variant: "destructive" });
      return;
    }

    const productData = {
      name: productName.trim(),
      type: productType.trim(),
      property_type: propertyType.trim(),
      size: size.trim(),
      description: productDescription.trim(),
      price: parseFloat(productPrice),
      value: parseInt(productValue, 10),
      image_url: productImageUrl.trim() || null,
      category_id: categoryIdToUse,
      isActive: isActive,
    };
    
    onSubmit(productData, selectedAddonTemplateIds);
  };

  const renderSelectField = (id, label, value, onValueChange, placeholder, options, isLoadingOptions, loadingText) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-300">{label}</Label>
      {isLoadingOptions ? (
        <div className="flex items-center text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingText}
        </div>
      ) : (
        <Select onValueChange={onValueChange} value={value}>
          <SelectTrigger id={id} className="w-full bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            {options.map((opt) => (
              <SelectItem key={opt.value || opt.id} value={opt.value || opt.id} className="hover:bg-slate-600 focus:bg-slate-600">
                {opt.label || opt.name}
              </SelectItem>
            ))}
            {id === "category" && (
              <SelectGroup>
                <SelectLabel className="text-slate-400">Or</SelectLabel>
                <SelectItem value="new_category" className="hover:bg-slate-600 focus:bg-slate-600">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Category
                </SelectItem>
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );


  return (
    <form onSubmit={internalHandleSubmit} className="space-y-6">
      {renderSelectField("category", "Product Category", selectedCategoryId, setSelectedCategoryId, "Select a category or create new", categories, isFetchingCategories, "Loading categories...")}

      {selectedCategoryId === 'new_category' && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <Label htmlFor="newCategoryName" className="text-slate-300">New Category Name</Label>
          <Input
            id="newCategoryName"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter new category name"
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500"
          />
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="productName" className="text-slate-300">Product Name</Label>
        <Input
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g., Deep Cleaning Service"
          required
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500"
        />
      </div>

      {renderSelectField("productType", "Type", productType, setProductType, "Select product type", productTypeOptions, false, "")}
      {renderSelectField("propertyType", "Property Type", propertyType, setPropertyType, "Select property type", propertyTypeOptions, false, "")}
      {renderSelectField("size", "Size", size, setSize, "Select size", sizeOptions, false, "")}


      <div className="space-y-2">
        <Label htmlFor="productDescription" className="text-slate-300">Description</Label>
        <Textarea
          id="productDescription"
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          placeholder="Detailed description of the service/product"
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500 min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="productPrice" className="text-slate-300">Price ($)</Label>
          <Input
            id="productPrice"
            type="number"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            placeholder="e.g., 99.99"
            required
            min="0"
            step="0.01"
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productValue" className="text-slate-300">Value (integer)</Label>
          <Input
            id="productValue"
            type="number"
            value={productValue}
            onChange={(e) => setProductValue(e.target.value)}
            placeholder="e.g., 100"
            required
            min="0"
            step="1"
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="productImageUrl" className="text-slate-300">Image URL (Optional)</Label>
        <Input
          id="productImageUrl"
          value={productImageUrl}
          onChange={(e) => setProductImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-sky-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Link Addon Templates</Label>
        {isFetchingAddons ? (
          <div className="flex items-center text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading addon templates...
          </div>
        ) : addonTemplates.length === 0 ? (
          <p className="text-slate-400 text-sm">No addon templates available. Create some first!</p>
        ) : (
          <div className="space-y-2 p-3 bg-slate-700/50 rounded-md border border-slate-600 max-h-60 overflow-y-auto">
            {addonTemplates.map(template => (
              <div key={template.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-600/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`addon-template-${template.id}`}
                    checked={selectedAddonTemplateIds.includes(template.id)}
                    onCheckedChange={() => handleAddonToggle(template.id)}
                    className="border-slate-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label htmlFor={`addon-template-${template.id}`} className="text-slate-300 cursor-pointer">
                    {template.name} (${template.price}) {template.is_required ? "(Required by template)" : ""}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-600"
        />
        <Label htmlFor="isActive" className="text-slate-300">
          Product is Active
        </Label>
      </div>
      
      <Button 
        type="submit" 
        disabled={isLoading || isFetchingCategories || isFetchingAddons} 
        className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 text-base disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <PlusCircle className="mr-2 h-5 w-5" />
        )}
        {isLoading ? 'Processing...' : submitButtonText}
      </Button>
    </form>
  );
};

export default ServiceForm;