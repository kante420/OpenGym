import { BrandMark } from '@/components/brand';

/** Logo del gimnasio (se sirve por /api/logo/<código>); si no tiene, la marca de OpenGym. */
export function GymLogo({ slug, version, className = 'h-8 w-auto' }: { slug: string; version: string | number | null | undefined; className?: string }) {
  if (!version) return <BrandMark className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/logo/${slug}?v=${encodeURIComponent(String(version))}`} alt="" className={`${className} object-contain`} />;
}
