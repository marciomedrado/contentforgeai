
"use client";

import type { ContentStatus } from '@/lib/types'; // Removed Platform as it's handled globally
import { CONTENT_STATUS_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CalendarIcon, FilterX } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ContentFiltersState {
  // platform?: Platform; // Removed: Handled by global empresa filter
  status?: ContentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  empresaId?: string | null; // This will be controlled globally by AppHeader now
}

interface ContentFiltersProps {
  filters: ContentFiltersState;
  onFiltersChange: (filters: ContentFiltersState) => void;
  className?: string;
  // empresas prop is no longer needed here as company selection is global
}

export function ContentFilters({ filters, onFiltersChange, className }: ContentFiltersProps) {
  
  const handleResetFilters = () => {
    onFiltersChange({
      // platform: undefined, // Removed
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      searchTerm: undefined,
      empresaId: filters.empresaId, // Keep global empresaId if set
    });
  };
  
  return (
    <div className={cn("mb-6 p-4 border rounded-lg shadow-sm bg-card", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground">Pesquisar</label>
          <Input
            id="searchTerm"
            placeholder="Título ou tópico..."
            value={filters.searchTerm || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          />
        </div>
        
        {/* Platform filter removed - now global via AppHeader */}

        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium text-muted-foreground">Status</label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === "all" ? undefined : value as ContentStatus | undefined })}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {CONTENT_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="dateFrom" className="text-sm font-medium text-muted-foreground">De</label>
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
                {filters.dateFrom ? format(filters.dateFrom, "PPP") : <span>Escolha data</span>}
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
          <label htmlFor="dateTo" className="text-sm font-medium text-muted-foreground">Até</label>
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
                {filters.dateTo ? format(filters.dateTo, "PPP") : <span>Escolha data</span>}
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
            <FilterX className="mr-2 h-4 w-4" /> Resetar Filtros
        </Button>
      </div>
    </div>
  );
}
