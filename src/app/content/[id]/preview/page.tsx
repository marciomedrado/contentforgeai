
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentItemById } from '@/lib/storageService';
import type { ContentItem } from '@/lib/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ContentPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const contentId = params?.id as string;
  const [item, setItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (contentId) {
      const fetchedItem = getContentItemById(contentId);
      if (fetchedItem) {
        setItem(fetchedItem);
      } else {
        // Handle item not found, maybe redirect or show error
        console.error("Content item not found for preview:", contentId);
        router.push('/'); // Or a dedicated 404 page
      }
      setIsLoading(false);
    }
  }, [contentId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Loading Preview..." />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Content Not Found" />
        <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center">
          <p className="text-lg text-muted-foreground mb-4">The content you are looking for could not be found.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title={`Preview: ${item.title.substring(0, 50)}${item.title.length > 50 ? '...' : ''}`} />
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">{item.title}</CardTitle>
            <CardDescription>Platform: {item.platform} | Status: {item.status}</CardDescription>
          </CardHeader>
          <CardContent>
            {item.platform === 'Wordpress' ? (
              <div
                className="prose prose-sm lg:prose-base max-w-none bg-white dark:bg-muted p-4 rounded-md shadow"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <pre className="whitespace-pre-wrap p-4 bg-muted rounded-md shadow text-sm md:text-base">
                {item.content}
              </pre>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
