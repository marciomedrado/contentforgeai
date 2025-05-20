"use client";

import { useState, useEffect, useMemo } from 'react';
import type { ContentItem } from '@/lib/types';
import { getStoredContentItems, deleteContentItem as deleteStoredContentItem } from '@/lib/storageService';
import { ContentCard } from './ContentCard';
import { ContentFilters, type ContentFiltersState } from './ContentFilters';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function ContentListClient() {
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ContentFiltersState>({});
  const { toast } = useToast();

  useEffect(() => {
    setAllItems(getStoredContentItems());
    setIsLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this content item?")) {
      deleteStoredContentItem(id);
      setAllItems(prevItems => prevItems.filter(item => item.id !== id));
      toast({
        title: "Content Deleted",
        description: "The content item has been successfully deleted.",
      });
    }
  };

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
    return <p>Loading content...</p>; // Replace with Skeleton loaders later
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
