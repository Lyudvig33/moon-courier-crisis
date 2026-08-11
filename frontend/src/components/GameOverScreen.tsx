import type { GameSummary } from '../types';

interface Props {
  game: GameSummary;
  onPlayAgain: () => void;
  loading: boolean;
}

export function GameOverScreen({ game, onPlayAgain, loading }: Props) {
  const won = game.status === 'WON';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="panel animate-fade-in w-full max-w-lg p-8 text-center">
        <p className="font-display text-xs tracking-[0.2em] text-[var(--accent)]">
          {won ? 'MOON MISSION COMPLETE' : 'MISSION FAILED'}
        </p>
        <h2 className="mt-3 font-display text-3xl">
          Grade {game.stats.grade ?? 'D'}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Final Score" value={`${game.score}`} />
          <Stat label="Final Credits" value={`$${game.money}`} />
          <Stat label="Successful" value={`${game.stats.delivered}`} />
          <Stat label="Failed" value={`${game.stats.failed}`} />
          <Stat label="Base Rating" value={`${game.baseRating}`} />
          <Stat label="Days Survived" value={`${Math.min(game.day, 7)}`} />
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onPlayAgain}
          className="mt-8 w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-display text-sm tracking-wider text-[#061018] hover:brightness-110 disabled:opacity-50"
        >
          {loading ? 'RESETTING…' : 'PLAY AGAIN'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-3">
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}
