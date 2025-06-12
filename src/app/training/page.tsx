
import { AppHeader } from '@/components/layout/AppHeader';
import { TrainingClient } from '@/components/training/TrainingClient';

export default function TrainingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Treinamento de Funcionários de IA" />
      <main className="flex-1 p-4 md:p-6">
        <TrainingClient />
      </main>
    </div>
  );
}
