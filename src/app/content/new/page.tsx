import { AppHeader } from '@/components/layout/AppHeader';
import { ContentFormClient } from '@/components/content/ContentFormClient';

interface NewContentPageProps {
  searchParams?: {
    title?: string;
    topic?: string;
  };
}

export default function NewContentPage({ searchParams }: NewContentPageProps) {
  const initialTitle = searchParams?.title;
  const initialTopic = searchParams?.topic;

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Create New Content" />
      <main className="flex-1 p-4 md:p-6">
        <ContentFormClient initialTitle={initialTitle} initialTopic={initialTopic} />
      </main>
    </div>
  );
}
