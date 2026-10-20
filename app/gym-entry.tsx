'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GymEntry() {
  const router = useRouter();
  const [code, setCode] = useState('');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toLowerCase().replace(/^\/+/, ''); if (c) router.push(`/${encodeURIComponent(c)}`); }}>
      <label><span className="label">Código de tu gimnasio</span>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="mi-gimnasio" autoCapitalize="none" spellCheck={false} required />
      </label>
      <button className="btn btn-ghost w-full">Entrar</button>
    </form>
  );
}
