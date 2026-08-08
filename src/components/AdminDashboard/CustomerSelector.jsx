import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
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
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';

const PROFILE_COLUMNS = 'id, first_name, last_name, email, phone';

const getProfileLabel = (profile) => {
  if (!profile) return '';
  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || profile.phone || 'Unnamed customer';
};

const getSearchTerms = (searchQuery) => searchQuery
  .trim()
  .split(/\s+/)
  .map((term) => term.replace(/[%,]/g, '').trim())
  .filter(Boolean)
  .slice(0, 3);

const CustomerSelector = ({
  selectedCustomerId,
  onCustomerSelect,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileSnapshot, setSelectedProfileSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { adminUser } = useAdminAuth();
  const { hasPerm, isSuperadmin } = usePermissionContext();

  const canViewAllCustomers = isSuperadmin || hasPerm('purchases.view_all');

  useEffect(() => {
    const fetchInitialProfiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!canViewAllCustomers && adminUser?.id) {
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
      fetchInitialProfiles();
    }
  }, [adminUser, canViewAllCustomers]);

  useEffect(() => {
    if (!open || !adminUser) return;

    const terms = getSearchTerms(searchQuery);
    if (terms.length === 0) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .or(
            terms.flatMap((term) => [
              `first_name.ilike.%${term}%`,
              `last_name.ilike.%${term}%`,
              `email.ilike.%${term}%`,
              `phone.ilike.%${term}%`,
            ]).join(',')
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (!canViewAllCustomers && adminUser?.id) {
          query = query.eq('id', adminUser.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setProfiles((currentProfiles) => {
          const byId = new Map();
          [...(data || []), ...currentProfiles].forEach((profile) => {
            byId.set(profile.id, profile);
          });
          return Array.from(byId.values()).slice(0, 100);
        });
      } catch (error) {
        console.error("Error searching profiles:", error);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, open, adminUser, canViewAllCustomers]);

  useEffect(() => {
    const fetchSelectedProfile = async () => {
      if (!selectedCustomerId || profiles.some((profile) => profile.id === selectedCustomerId)) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', selectedCustomerId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSelectedProfileSnapshot(data);
          setProfiles((currentProfiles) => [
            data,
            ...currentProfiles.filter((profile) => profile.id !== data.id)
          ]);
        }
      } catch (error) {
        console.error("Error fetching selected profile:", error);
      }
    };

    fetchSelectedProfile();
  }, [selectedCustomerId, profiles]);

  const filteredProfiles = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return profiles;

    return profiles.filter((profile) => {
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
      const email = (profile.email || '').toLowerCase();
      const phone = (profile.phone || '').toLowerCase();

      return fullName.includes(search) || email.includes(search) || phone.includes(search);
    });
  }, [profiles, searchQuery]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedCustomerId)
    || (selectedProfileSnapshot?.id === selectedCustomerId ? selectedProfileSnapshot : null);

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
                {getProfileLabel(selectedProfile)} ({selectedProfile.email || selectedProfile.phone})
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
          <Command
            shouldFilter={false}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <CommandInput
              value={searchQuery}
              placeholder="Search customers..."
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                </div>
              ) : "No customer found."}
            </CommandEmpty>
            <CommandGroup
              className="max-h-[280px] overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {filteredProfiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.id}
                  onSelect={() => {
                    setSelectedProfileSnapshot(profile);
                    onCustomerSelect(profile.id === selectedCustomerId ? null : profile.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCustomerId === profile.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {getProfileLabel(profile)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[profile.email, profile.phone].filter(Boolean).join(' - ')}
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
                    setSelectedProfileSnapshot(null);
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
