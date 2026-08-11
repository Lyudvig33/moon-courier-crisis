import type { Rover } from '../types';

const statusColor: Record<string, string> = {
  AVAILABLE: 'text-[var(--success)]',
  BUSY: 'text-[var(--warn)]',
  DAMAGED: 'text-[var(--danger)]',
  CHARGING: 'text-[var(--accent)]',
};

interface Props {
  rovers: Rover[];
  selectedRoverId: string | null;
  onSelect: (id: string | null) => void;
}

export function RoverStrip({ rovers, selectedRoverId, onSelect }: Props) {
  return (
    <div className="panel p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-sm tracking-[0.12em] text-[var(--accent)]">
          ROVERS
        </h2>
        <p className="text-[10px] text-[var(--muted)]">Routes always launch from Base</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {rovers.map((rover) => {
          const selected = rover.id === selectedRoverId;
          const batteryColor =
            rover.battery < 30
              ? 'bg-[var(--danger)]'
              : rover.battery < 60
                ? 'bg-[var(--warn)]'
                : 'bg-[var(--success)]';
          const available = rover.status === 'AVAILABLE';

          return (
            <button
              key={rover.id}
              type="button"
              disabled={!available}
              onClick={() => onSelect(selected ? null : rover.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border)] bg-black/15 hover:bg-black/25'
              } ${!available ? 'cursor-not-allowed opacity-55' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm">{rover.name}</span>
                <span className={`text-xs font-semibold ${statusColor[rover.status]}`}>
                  {rover.status}
                </span>
              </div>
              <div className="mb-2 text-xs text-[var(--muted)]">
                Cap {rover.maxCapacity} · Spd {rover.speed} · Zone{' '}
                {rover.currentZone?.name ?? '—'}
              </div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Battery</span>
                <span>{Math.round(rover.battery)}%</span>
              </div>
              <div className="battery-bar">
                <span
                  className={batteryColor}
                  style={{ width: `${Math.max(0, Math.min(100, rover.battery))}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
