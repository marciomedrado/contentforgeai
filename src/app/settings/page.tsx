import { AppHeader } from '@/components/layout/AppHeader';
import { SettingsFormClient } from '@/components/settings/SettingsFormClient';

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Settings" />
      <main className="flex-1 p-4 md:p-6">
        <SettingsFormClient />
      </main>
    </div>
  );
}
