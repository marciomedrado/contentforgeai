"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface AppHeaderProps {
  title: string;
  showCreateButton?: boolean;
}

export function AppHeader({ title, showCreateButton = false }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-xl font-semibold">{title}</h1>
      {showCreateButton && (
        <div className="ml-auto">
          <Button asChild>
            <Link href="/content/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Content
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}
