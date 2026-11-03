import { requirePage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/primitives';
import { ChangePasswordCard } from '@/components/change-password';
import { secretsConfigured } from '@/lib/crypto';
import { getGymMailStatus } from '@/lib/gym-mail';
import { SettingsForm } from './settings-form';
import { LogoCard, MailCard } from './branding-cards';
import { ThemeSelectorCard } from './theme-card';

export const metadata = { title: 'Ajustes' };

export default async function SettingsPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { gym } = await requirePage(subdomain, ['ADMINISTRADOR']);
  const mail = await getGymMailStatus(gym.id);
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos fiscales y de contacto que se usan en los recibos y correos." />
      <div className="space-y-6">
        <SettingsForm gym={gym} />
        <ThemeSelectorCard currentTheme={gym.color_theme} />
        <LogoCard slug={gym.subdomain} version={gym.logo_updated_at} />
        <MailCard status={mail} canEncrypt={secretsConfigured()} />
        <ChangePasswordCard />
      </div>
    </>
  );
}
