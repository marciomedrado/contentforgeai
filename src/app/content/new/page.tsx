import { AppHeader } from '@/components/layout/AppHeader';
import { ContentFormClient } from '@/components/content/ContentFormClient';

export default function NewContentPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Create New Content" />
      <main className="flex-1 p-4 md:p-6">
        <ContentFormClient />
      </main>
    </div>
  );
}
