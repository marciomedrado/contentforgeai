
import { AppHeader } from '@/components/layout/AppHeader';
import { EmpresasClient } from '@/components/empresas/EmpresasClient';

export default function EmpresasPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Gerenciar Empresas" />
      <main className="flex-1 p-4 md:p-6">
        <EmpresasClient />
      </main>
    </div>
  );
}
