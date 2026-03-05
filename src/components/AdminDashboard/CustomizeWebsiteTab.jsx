import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, FileImage as ImageIcon } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const CustomizeWebsiteTab = () => {
  const { adminUser } = useAdminAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [bannerData, setBannerData] = useState({
    title: '',
    description: '',
    promoCode: '',
    imageUrl: '',
    isVisible: true
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_content')
        .select('content')
        .eq('section_key', 'dashboard_promo_banner')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
         throw error;
      }

      if (data) {
        setBannerData(data.content);
      }
    } catch (error) {
      console.error('Error fetching website content:', error);
      toast({
        title: "Error",
        description: "Failed to load current content settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('website_content')
        .upsert({ 
          section_key: 'dashboard_promo_banner',
          content: bannerData,
          updated_at: new Date(),
          updated_by: adminUser.id
        }, { onConflict: 'section_key' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotional banner updated successfully.",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBannerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked) => {
    setBannerData(prev => ({
      ...prev,
      isVisible: checked
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customize Website</h2>
          <p className="text-gray-500">Manage promotional banners and content displayed on the customer dashboard.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Promotional Banner</CardTitle>
            <CardDescription>
              Configure the banner that appears on the main user dashboard between "Your Jobs" and "Services".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="space-y-0.5">
                  <Label className="text-base">Banner Visibility</Label>
                  <p className="text-sm text-gray-500">Show or hide this banner on the dashboard</p>
                </div>
                <Switch 
                  checked={bannerData.isVisible}
                  onCheckedChange={handleSwitchChange}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Banner Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    value={bannerData.title} 
                    onChange={handleChange} 
                    placeholder="e.g., Get 20% Off Your First Deep Clean!"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                  <Input 
                    id="promoCode" 
                    name="promoCode" 
                    value={bannerData.promoCode} 
                    onChange={handleChange} 
                    placeholder="e.g., FRESHSTART"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description Text</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={bannerData.description} 
                  onChange={handleChange} 
                  placeholder="e.g., Use code FRESHSTART at checkout."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Background Image URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      id="imageUrl" 
                      name="imageUrl" 
                      value={bannerData.imageUrl} 
                      onChange={handleChange} 
                      className="pl-9"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Recommended aspect ratio: 3:1 or 4:1 (e.g., 1200x400px). 
                  Use "Copy Image Link" from an online image source.
                </p>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <Label className="mb-2 block">Live Preview</Label>
                <div className={`w-full aspect-[3/1] relative rounded-xl overflow-hidden shadow-sm group border border-gray-200 ${!bannerData.isVisible ? 'opacity-50 grayscale' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10 p-6 flex flex-col justify-center text-white">
                        <h3 className="text-lg md:text-2xl font-bold mb-1">{bannerData.title || 'Banner Title'}</h3>
                        <p className="text-xs md:text-sm font-medium opacity-90 max-w-[80%]">
                             {bannerData.description && (
                               <span>{bannerData.description.replace(bannerData.promoCode, '')}</span>
                             )}
                             {bannerData.promoCode && (
                               <span className="font-bold bg-white/20 px-1 rounded ml-1">{bannerData.promoCode}</span>
                             )}
                        </p>
                    </div>
                    {bannerData.imageUrl ? (
                        <img className="absolute inset-0 w-full h-full object-cover" alt="Preview" src={bannerData.imageUrl} onError={(e) => e.target.src = "https://placehold.co/800x200?text=Invalid+Image+URL"} />
                    ) : (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400">No Image Selected</div>
                    )}
                    {!bannerData.isVisible && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                        <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">Hidden</span>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomizeWebsiteTab;