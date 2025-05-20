"use client";

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HtmlEditorProps {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
}

export function HtmlEditor({ initialHtml, onHtmlChange }: HtmlEditorProps) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>HTML Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="html-editor-textarea" className="sr-only">HTML Content</Label>
          <Textarea
            id="html-editor-textarea"
            value={htmlContent}
            onChange={handleHtmlInputChange}
            placeholder="Enter HTML content here..."
            className="min-h-[300px] font-mono text-sm"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none p-4 border rounded-md min-h-[300px] bg-white dark:bg-muted overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
