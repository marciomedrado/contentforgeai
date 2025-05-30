
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ContentItem } from '@/lib/types';
import { getStoredContentItems, deleteContentItemById } from '@/lib/storageService';
import { ContentCard } from './ContentCard';
import { ContentFilters, type ContentFiltersState } from './ContentFilters';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { CONTENT_STORAGE_KEY } from '@/lib/constants';

export function ContentListClient() {
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ContentFiltersState>({});
  const { toast } = useToast();

  const refreshContentItems = useCallback(() => {
    setAllItems(getStoredContentItems());
  }, []);

  useEffect(() => {
    refreshContentItems();
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONTENT_STORAGE_KEY) {
        refreshContentItems();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshContentItems]);

  const handleDelete = useCallback((id: string) => {
    deleteContentItemById(id);
    setAllItems(getStoredContentItems()); // Re-fetch from localStorage and update state
    toast({
      title: "Content Deleted",
      description: "The content item has been successfully deleted.",
    });
  }, [toast]); // setAllItems is stable, getStoredContentItems is a stable import

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (filters.searchTerm && 
          !item.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !item.topic.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.platform && filters.platform !== "all" && item.platform !== filters.platform) return false;
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      
      const itemDate = parseISO(item.createdAt);
      if (filters.dateFrom && itemDate < startOfDay(filters.dateFrom)) return false;
      if (filters.dateTo && itemDate > endOfDay(filters.dateTo)) return false;
      
      return true;
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [allItems, filters]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ContentFilters filters={filters} onFiltersChange={setFilters} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-10 bg-muted rounded w-full"></div>
              <div className="flex justify-between">
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContentFilters filters={filters} onFiltersChange={setFilters} />
      {filteredItems.length === 0 ? (
         <Alert className="mt-8 border-accent">
          <Bot className="h-5 w-5 text-accent-foreground" />
          <AlertTitle className="text-accent-foreground">No Content Found</AlertTitle>
          <AlertDescription>
            No content items match your current filters, or you haven't created any content yet. Try adjusting your filters or creating new content.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <ContentCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

