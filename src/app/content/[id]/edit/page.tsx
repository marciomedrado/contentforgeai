import { AppHeader } from '@/components/layout/AppHeader';
import { ContentFormClient } from '@/components/content/ContentFormClient';

interface EditContentPageProps {
  params: { id: string };
}

export default function EditContentPage({ params }: EditContentPageProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Edit Content" />
      <main className="flex-1 p-4 md:p-6">
        <ContentFormClient contentId={params.id} />
      </main>
    </div>
  );
}
