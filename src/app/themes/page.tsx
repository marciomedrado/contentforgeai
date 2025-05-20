import { AppHeader } from '@/components/layout/AppHeader';
import { ThemePlannerClient } from '@/components/themes/ThemePlannerClient';

export default function ThemePlannerPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Proactive Theme Planner" />
      <main className="flex-1 p-4 md:p-6">
        <ThemePlannerClient />
      </main>
    </div>
  );
}
