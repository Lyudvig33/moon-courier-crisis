import type { DeliveryResult } from '../types';

interface Props {
  phase: 'idle' | 'launching' | 'result';
  result: DeliveryResult | null;
  onClose: () => void;
}

function formatSignedMoney(value: number): string {
  if (value > 0) return `+$${value}`;
  if (value < 0) return `-$${Math.abs(value)}`;
  return '$0';
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export function DeliveryModal({ phase, result, onClose }: Props) {
  if (phase === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="panel w-full max-w-md p-6 text-center">
        {phase === 'launching' && (
          <div className="animate-launch py-8">
            <p className="font-display text-2xl text-[var(--accent)]">🚀 Rover launched</p>
            <p className="mt-3 text-sm text-[var(--muted)]">Transit simulation in progress…</p>
          </div>
        )}
        {phase === 'result' && result && (
          <div className="animate-fade-in">
            <p
              className={`font-display text-2xl ${
                result.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}
            >
              {result.message}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Delta label="Money" value={formatSignedMoney(result.moneyDelta)} />
              <Delta label="Score" value={formatSigned(result.scoreDelta)} />
              <Delta label="Battery" value={`${result.batteryDelta}%`} />
              <Delta
                label="Base rating"
                value={formatSigned(result.baseRatingDelta)}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg border border-[var(--border)] px-4 py-3 font-display text-xs tracking-wider text-[var(--accent)] hover:border-[var(--accent)]"
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Delta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-2">
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
