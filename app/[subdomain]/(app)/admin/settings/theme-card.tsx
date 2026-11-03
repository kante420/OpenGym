'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Card } from '@/components/ui/primitives';
import { COLOR_THEMES, type ColorThemeId, DEFAULT_THEME } from '@/lib/theme';
import { updateGymTheme } from '@/lib/actions/settings';

export function ThemeSelectorCard({ currentTheme }: { currentTheme?: string | null }) {
  const [selected, setSelected] = useState<ColorThemeId>(
    (currentTheme && currentTheme in COLOR_THEMES ? currentTheme : DEFAULT_THEME) as ColorThemeId,
  );

  return (
    <Card title="Identidad visual y gama de colores">
      <ActionForm action={updateGymTheme} className="space-y-5">
        <p className="text-sm text-muted">
          Personaliza los colores principales, reflejos y degradados de los botones, barras de progreso y acentos de tu gimnasio.
        </p>

        <input type="hidden" name="color_theme" value={selected} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(COLOR_THEMES) as ColorThemeId[]).map((key) => {
            const theme = COLOR_THEMES[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`relative flex flex-col gap-2.5 rounded-lg border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-gold bg-panel2 ring-2 ring-gold/40'
                    : 'border-line bg-canvas/30 hover:border-muted hover:bg-canvas/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-fg">{theme.name}</span>
                  {isSelected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-gold text-ink">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Barra con el degradado del tema */}
                <div
                  className="h-7 w-full rounded-md shadow-inner"
                  style={{ background: theme.gradient }}
                />

                <p className="text-xs text-faint line-clamp-2">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton>Guardar tema de color</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
