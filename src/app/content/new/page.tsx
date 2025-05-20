
import { AppHeader } from '@/components/layout/AppHeader';
import { ContentFormClient } from '@/components/content/ContentFormClient';
import type { ReferenceMaterial } from '@/lib/types';

interface NewContentPageProps {
  searchParams?: {
    title?: string;
    topic?: string;
    research?: string; // JSON string of ResearchLinkItem[]
    manualRefs?: string; // JSON string of string[] (manual reference texts)
  };
}

export default function NewContentPage({ searchParams }: NewContentPageProps) {
  const initialTitle = searchParams?.title;
  const initialTopic = searchParams?.topic;
  
  let initialResearchItems: ReferenceMaterial[] | undefined = undefined;
  if (searchParams?.research) {
    try {
      initialResearchItems = JSON.parse(searchParams.research);
    } catch (e) {
      console.error("Failed to parse research items from query params:", e);
    }
  }

  let initialManualReferenceTexts: string[] | undefined = undefined;
  if (searchParams?.manualRefs) {
    try {
      initialManualReferenceTexts = JSON.parse(searchParams.manualRefs);
    } catch (e) {
      console.error("Failed to parse manual reference texts from query params:", e);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Create New Content" />
      <main className="flex-1 p-4 md:p-6">
        <ContentFormClient 
          initialTitle={initialTitle} 
          initialTopic={initialTopic} 
          initialReferenceItems={initialResearchItems}
          initialManualReferenceTexts={initialManualReferenceTexts}
        />
      </main>
    </div>
  );
}
