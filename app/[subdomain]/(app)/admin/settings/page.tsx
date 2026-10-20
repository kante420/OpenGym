import { requirePage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/primitives';
import { ChangePasswordCard } from '@/components/change-password';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Ajustes' };

export default async function SettingsPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { gym } = await requirePage(subdomain, ['ADMINISTRADOR']);
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos fiscales y de contacto que se usan en los recibos y correos." />
      <div className="space-y-6"><SettingsForm gym={gym} /><ChangePasswordCard /></div>
    </>
  );
}
