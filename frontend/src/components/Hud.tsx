import type { GameSummary } from '../types';

interface Props {
  game: GameSummary;
  onNextDay: () => void;
  nextDayLoading: boolean;
}

export function Hud({ game, onNextDay, nextDayLoading }: Props) {
  const modifiers: string[] = [];
  if (game.solarStormActive) modifiers.push('Solar Storm');
  if (game.luckySignalActive) modifiers.push('Lucky Signal');
  if (game.dustStormZoneId) modifiers.push('Dust Storm');
  if (game.routeRiskBonus > 0) modifiers.push(`Risk +${game.routeRiskBonus}`);

  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-display text-xs tracking-[0.2em] text-[var(--accent)]">
          MOON COURIER CRISIS
        </p>
        <h1 className="mt-1 font-display text-xl md:text-2xl">Lunar Delivery Base</h1>
        {modifiers.length > 0 && (
          <p className="mt-2 text-xs text-[var(--warn)]">
            Active: {modifiers.join(' · ')}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Stat label="Day" value={`${game.day} / 7`} />
        <Stat label="Money" value={`$${game.money}`} />
        <Stat label="Score" value={`${game.score}`} />
        <Stat label="Base Rating" value={`${game.baseRating}`} />
        <button
          type="button"
          onClick={onNextDay}
          disabled={nextDayLoading || game.status !== 'ACTIVE'}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 font-display text-xs tracking-wider text-[var(--accent)] transition hover:border-[var(--accent)] disabled:opacity-40"
        >
          NEXT DAY
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="font-display text-sm">{value}</div>
    </div>
  );
}
