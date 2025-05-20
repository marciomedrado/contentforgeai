"use client";

import type { Platform, ContentStatus } from '@/lib/types';
import { PLATFORM_OPTIONS, CONTENT_STATUS_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CalendarIcon, FilterX } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ContentFiltersState {
  platform?: Platform;
  status?: ContentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

interface ContentFiltersProps {
  filters: ContentFiltersState;
  onFiltersChange: (filters: ContentFiltersState) => void;
  className?: string;
}

export function ContentFilters({ filters, onFiltersChange, className }: ContentFiltersProps) {
  
  const handleResetFilters = () => {
    onFiltersChange({
      platform: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      searchTerm: undefined,
    });
  };
  
  return (
    <div className={cn("mb-6 p-4 border rounded-lg shadow-sm bg-card", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground">Search</label>
          <Input
            id="searchTerm"
            placeholder="Search by title or topic..."
            value={filters.searchTerm || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="platform" className="text-sm font-medium text-muted-foreground">Platform</label>
          <Select
            value={filters.platform}
            onValueChange={(value) => onFiltersChange({ ...filters, platform: value as Platform | undefined })}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORM_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium text-muted-foreground">Status</label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value as ContentStatus | undefined })}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CONTENT_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="dateFrom" className="text-sm font-medium text-muted-foreground">Date From</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dateFrom"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date || undefined })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="dateTo" className="text-sm font-medium text-muted-foreground">Date To</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dateTo"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => onFiltersChange({ ...filters, dateTo: date || undefined })}
                disabled={(date) =>
                  filters.dateFrom ? date < filters.dateFrom : false
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleResetFilters} variant="ghost" className="xl:mt-5 text-sm">
            <FilterX className="mr-2 h-4 w-4" /> Reset Filters
        </Button>
      </div>
    </div>
  );
}
