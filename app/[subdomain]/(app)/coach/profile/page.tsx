import { requirePage } from '@/lib/auth';
import { Card, PageHeader } from '@/components/ui/primitives';
import { ChangePasswordCard } from '@/components/change-password';

export const metadata = { title: 'Perfil' };

export default async function CoachProfile({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { profile } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  return (
    <>
      <PageHeader title="Perfil" />
      <div className="space-y-6">
        <Card title="Tus datos"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-faint">Nombre</dt><dd className="font-semibold">{profile.full_name}</dd></div><div><dt className="text-faint">Usuario</dt><dd className="font-semibold">@{profile.username}</dd></div></dl></Card>
        <ChangePasswordCard />
      </div>
    </>
  );
}
