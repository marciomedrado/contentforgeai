
import { AppHeader } from '@/components/layout/AppHeader';
import { SummarizerClient } from '@/components/summarizer/SummarizerClient';

export default function SummarizerPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Text Summarizer" />
      <main className="flex-1 p-4 md:p-6">
        <SummarizerClient />
      </main>
    </div>
  );
}
