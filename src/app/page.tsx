import { AppHeader } from '@/components/layout/AppHeader';
import { ContentListClient } from '@/components/content/ContentListClient';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Content Dashboard" showCreateButton={true} />
      <main className="flex-1 p-4 md:p-6">
        <ContentListClient />
      </main>
    </div>
  );
}
