import type { DeliveryPreview } from '../types';

interface Props {
  preview: DeliveryPreview | undefined;
  loading: boolean;
  errorMessage?: string | null;
  canLaunch: boolean;
  launching: boolean;
  onLaunch: () => void;
}

export function DeliveryPreviewPanel({
  preview,
  loading,
  errorMessage,
  canLaunch,
  launching,
  onLaunch,
}: Props) {
  if (loading) {
    return (
      <div className="panel animate-fade-in p-4">
        <p className="font-display text-xs text-[var(--accent)]">Calculating route…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="panel animate-fade-in p-4">
        <p className="font-semibold text-[var(--danger)]">Preview failed</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{errorMessage}</p>
      </div>
    );
  }

  if (!preview) return null;

  const hasMetrics =
    preview.distance != null ||
    preview.batteryCost != null ||
    preview.risk != null;

  return (
    <div className="panel animate-fade-in p-4">
      <h3 className="font-display mb-3 text-sm tracking-[0.12em] text-[var(--accent)]">
        DELIVERY PREVIEW
      </h3>
      {hasMetrics && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {preview.distance != null && (
            <Metric label="Distance" value={`${preview.distance}`} />
          )}
          {preview.batteryCost != null && (
            <Metric label="Battery cost" value={`${preview.batteryCost}%`} />
          )}
          {preview.cargoWeight != null && (
            <Metric label="Cargo" value={`${preview.cargoWeight}`} />
          )}
          {preview.travelTime != null && (
            <Metric label="Travel time" value={`${preview.travelTime} min`} />
          )}
          {preview.risk != null && <Metric label="Risk" value={`${preview.risk}`} />}
          {preview.reward != null && (
            <Metric label="Reward" value={`$${preview.reward}`} />
          )}
        </div>
      )}
      {preview.possible ? (
        <ul className="mb-4 space-y-1 text-sm">
          <li className="text-[var(--success)]">✓ Capacity sufficient</li>
          <li className="text-[var(--success)]">✓ Battery sufficient</li>
          {preview.warnings.map((w) => (
            <li key={w} className="text-[var(--warn)]">
              ⚠ {w}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-4">
          <p className="mb-2 font-semibold text-[var(--danger)]">❌ Delivery impossible</p>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            {preview.errors.map((e) => (
              <li key={e.code}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        disabled={!canLaunch || launching}
        onClick={onLaunch}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-display text-sm tracking-wider text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {launching ? 'LAUNCHING…' : 'LAUNCH ROVER'}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-2">
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
