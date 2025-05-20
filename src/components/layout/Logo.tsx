import { Bot } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Bot className="h-8 w-8 text-primary" />
      {!collapsed && (
        <h1 className="text-xl font-semibold text-foreground whitespace-nowrap">
          {APP_NAME}
        </h1>
      )}
    </div>
  );
}
