
"use client";

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HtmlEditorProps {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  className?: string;
}

export function HtmlEditor({ initialHtml, onHtmlChange, className }: HtmlEditorProps) {
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  const handleHtmlInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = event.target.value;
    setHtmlContent(newHtml);
    onHtmlChange(newHtml);
  };

  const handleCopyHtml = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (htmlContent.trim()) {
      navigator.clipboard.writeText(htmlContent)
        .then(() => toast({ title: "HTML Copied!", description: "The HTML code has been copied to your clipboard." }))
        .catch(err => {
          console.error("Failed to copy HTML: ", err);
          toast({ title: "Copy Failed", description: "Could not copy HTML code.", variant: "destructive" });
        });
    } else {
      toast({ title: "Nothing to Copy", description: "HTML editor is empty.", variant: "destructive" });
    }
  };

  const handleCopyVisibleOutput = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (previewRef.current) {
      const textToCopy = previewRef.current.innerText || previewRef.current.textContent || '';
      if (textToCopy.trim()) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => toast({ title: "Visible Output Copied!", description: "The visible text output has been copied." }))
          .catch(err => {
            console.error("Failed to copy visible output: ", err);
            toast({ title: "Copy Failed", description: "Could not copy visible text output.", variant: "destructive" });
          });
      } else {
        toast({ title: "Nothing to Copy", description: "The preview is empty.", variant: "destructive" });
      }
    }
  };

  return (
    <div className={cn("flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>HTML Editor</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyHtml}>
            <Copy className="mr-2 h-4 w-4" /> Copiar HTML
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Label htmlFor="html-editor-textarea" className="sr-only">HTML Content</Label>
          <Textarea
            id="html-editor-textarea"
            value={htmlContent}
            onChange={handleHtmlInputChange}
            placeholder="Enter HTML content here..."
            className="flex-grow font-mono text-sm resize-none"
            suppressHydrationWarning={true}
          />
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Live Preview</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyVisibleOutput}>
            <Copy className="mr-2 h-4 w-4" /> Copiar Output Visível
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <div
            ref={previewRef}
            className="flex-grow prose prose-sm max-w-none p-4 border rounded-md bg-white dark:bg-muted overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
