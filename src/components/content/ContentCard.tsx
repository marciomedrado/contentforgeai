
import type { ContentItem, Platform } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Instagram, FacebookIcon, Edit3, Trash2, CalendarDays, AlertTriangle, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PlatformIcon: React.FC<{ platform: Platform, className?: string }> = ({ platform, className }) => {
  const commonProps = { className: cn("h-5 w-5", className) };
  if (platform === 'Wordpress') return <FileText {...commonProps} />;
  if (platform === 'Instagram') return <Instagram {...commonProps} />;
  if (platform === 'Facebook') return <FacebookIcon {...commonProps} />;
  return null;
};

interface ContentCardProps {
  item: ContentItem;
  onDelete: (id: string) => void;
}

export function ContentCard({ item, onDelete }: ContentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Link href={`/content/${item.id}/preview`} passHref legacyBehavior>
            <a className="hover:underline group">
              <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">{item.title}</CardTitle>
            </a>
          </Link>
          <PlatformIcon platform={item.platform} className="text-muted-foreground" />
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground">
          <CalendarDays className="mr-1 h-3 w-3" />
          Created: {format(parseISO(item.createdAt), 'MMM d, yyyy')}
          {item.status === 'Scheduled' && item.scheduledAt && (
            <span className="ml-2 flex items-center">
              <CalendarDays className="mr-1 h-3 w-3 text-blue-500" />
              Scheduled: {format(parseISO(item.scheduledAt), 'MMM d, yyyy HH:mm')}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 break-words">
          Topic: {item.topic}
        </p>
        {item.hashtags && item.hashtags.length > 0 && (
           <div className="mt-2 flex flex-wrap gap-1">
            {item.hashtags.slice(0,5).map(tag => (
              <Badge variant="secondary" key={tag} className="text-xs">#{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge
          variant={item.status === 'Published' ? 'default' : item.status === 'Scheduled' ? 'outline' : 'secondary'}
          className={cn(
            item.status === 'Published' && 'bg-green-500/20 text-green-700 border-green-500/30',
            item.status === 'Scheduled' && 'bg-blue-500/20 text-blue-700 border-blue-500/30',
            item.status === 'Draft' && 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
          )}
        >
          {item.status}
        </Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/content/${item.id}/preview`} passHref>
              <Eye className="h-4 w-4" />
               <span className="sr-only">View content {item.title}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/content/${item.id}/edit`} passHref>
              <Edit3 className="h-4 w-4" />
               <span className="sr-only">Edit content {item.title}</span>
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete content {item.title}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                   <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the content item titled "{item.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete content
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
