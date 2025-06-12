
"use client";

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HtmlEditorProps {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  className?: string;
}

export function HtmlEditor({ initialHtml, onHtmlChange, className }: HtmlEditorProps) {
  const [htmlContent, setHtmlContent] = useState(initialHtml);

  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  const handleHtmlInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = event.target.value;
    setHtmlContent(newHtml);
    onHtmlChange(newHtml);
  };

  return (
    <div className={cn("flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>HTML Editor</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Label htmlFor="html-editor-textarea" className="sr-only">HTML Content</Label>
          <Textarea
            id="html-editor-textarea"
            value={htmlContent}
            onChange={handleHtmlInputChange}
            placeholder="Enter HTML content here..."
            className="flex-grow font-mono text-sm resize-none"
          />
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <div
            className="flex-grow prose prose-sm max-w-none p-4 border rounded-md bg-white dark:bg-muted overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

    