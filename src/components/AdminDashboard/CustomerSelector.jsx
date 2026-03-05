import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';

const CustomerSelector = ({
  selectedCustomerId,
  onCustomerSelect,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { adminUser } = useAdminAuth();
  const { hasPerm, isSuperadmin } = usePermissionContext();

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const canViewAll = isSuperadmin || hasPerm('purchases.view_all');

        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .limit(50); // Limit to 50 for performance

        if (!canViewAll && adminUser?.id) {
          // If restricted, only show the current logged-in user's profile
          query = query.eq('id', adminUser.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    if (adminUser) {
      fetchProfiles();
    }
  }, [adminUser, isSuperadmin, hasPerm]);

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter((profile) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
    const email = (profile.email || '').toLowerCase();
    const phone = (profile.phone || '').toLowerCase();
    const search = searchQuery.toLowerCase();

    return fullName.includes(search) || email.includes(search) || phone.includes(search);
  });

  const selectedProfile = profiles.find(p => p.id === selectedCustomerId);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedProfile ? (
              <span className="truncate">
                {selectedProfile.first_name} {selectedProfile.last_name} ({selectedProfile.email || selectedProfile.phone})
              </span>
            ) : (
              <span className="text-muted-foreground">Select customer to auto-fill...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-hidden"
          align="start"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}>
            <CommandInput
              placeholder="Search customers..."
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : "No customer found."}
            </CommandEmpty>
            <CommandGroup className="max-h-[280px] overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}>
              {filteredProfiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.id}
                  onSelect={(currentValue) => {
                    onCustomerSelect(currentValue === selectedCustomerId ? null : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCustomerId === profile.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {profile.email} {profile.phone ? `• ${profile.phone}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {selectedCustomerId && (
              <div className="border-t p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomerSelect(null);
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-3 w-3" /> Clear Selection
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CustomerSelector;