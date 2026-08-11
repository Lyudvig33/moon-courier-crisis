import type { Order } from '../types';

const urgencyStyles: Record<string, string> = {
  LOW: 'bg-slate-600/40 text-slate-200',
  MEDIUM: 'bg-sky-900/50 text-sky-200',
  HIGH: 'bg-amber-900/50 text-amber-200',
  CRITICAL: 'bg-rose-900/60 text-rose-200',
};

interface Props {
  orders: Order[];
  selectedOrderId: string | null;
  onSelect: (id: string | null) => void;
}

function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return '—';
  if (ms <= 0) return 'Expired';
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

export function OrderPanel({ orders, selectedOrderId, onSelect }: Props) {
  const visible = orders.filter((o) =>
    ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'EXPIRED', 'ASSIGNED', 'CANCELLED'].includes(
      o.status,
    ),
  );

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-display text-sm tracking-[0.12em] text-[var(--accent)]">
          ORDERS
        </h2>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((order) => {
          const selected = order.id === selectedOrderId;
          const expired =
            order.status === 'EXPIRED' ||
            (order.status === 'PENDING' && new Date(order.expiresAt) <= new Date());
          const disabled = order.status !== 'PENDING' || expired;
          const nearExpiry =
            order.status === 'PENDING' &&
            !expired &&
            new Date(order.expiresAt).getTime() - Date.now() < 1000 * 60 * 60 * 24;

          return (
            <button
              key={order.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(selected ? null : order.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                  : 'border-transparent bg-black/20 hover:border-[var(--border)]'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {order.destinationZone?.name ?? 'Unknown'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${urgencyStyles[order.urgency]}`}
                >
                  {order.urgency}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                <span>Weight: {order.weight}</span>
                <span>Reward: ${order.reward}</span>
                <span>Risk: {order.risk}</span>
                <span>Status: {order.status}</span>
                <span className={nearExpiry || expired ? 'text-[var(--warn)]' : ''}>
                  Expires: {formatExpiry(order.expiresAt)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
