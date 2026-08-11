import type { Zone, Route, Order, Rover } from '../types';

interface Props {
  zones: Zone[];
  routes: Route[];
  orders: Order[];
  rovers: Rover[];
  selectedOrderId: string | null;
  selectedRoverId: string | null;
  dustStormZoneId?: string | null;
}

export function LunarMap({
  zones,
  routes,
  orders,
  rovers,
  selectedOrderId,
  selectedRoverId,
  dustStormZoneId,
}: Props) {
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const selectedRover = rovers.find((r) => r.id === selectedRoverId);
  const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]));

  const pendingDestinations = new Set(
    orders
      .filter((o) => o.status === 'PENDING')
      .map((o) => o.destinationZoneId),
  );

  return (
    <div className="panel relative h-full min-h-[360px] overflow-hidden p-3">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-white/70" />
        <div className="absolute left-[70%] top-[28%] h-0.5 w-0.5 rounded-full bg-white/50" />
        <div className="absolute left-[40%] top-[72%] h-1 w-1 rounded-full bg-white/40" />
        <div className="absolute left-[85%] top-[60%] h-0.5 w-0.5 rounded-full bg-white/60" />
      </div>
      <svg viewBox="0 0 800 560" className="h-full w-full">
        <defs>
          <radialGradient id="zoneGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7ec8e3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ec8e3" stopOpacity="0" />
          </radialGradient>
        </defs>

        {routes.map((route) => {
          const from = zoneById[route.fromZoneId];
          const to = zoneById[route.toZoneId];
          if (!from || !to || from.id > to.id) return null;
          const highlighted =
            selectedOrder?.destinationZoneId === to.id ||
            selectedOrder?.destinationZoneId === from.id;
          return (
            <line
              key={route.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={highlighted ? '#7ec8e3' : 'rgba(139,155,176,0.35)'}
              strokeWidth={highlighted ? 2.5 : 1.5}
              strokeDasharray={highlighted ? '0' : '6 4'}
            />
          );
        })}

        {zones.map((zone) => {
          const isBase = zone.terrain === 'BASE';
          const isDest = selectedOrder?.destinationZoneId === zone.id;
          const hasOrder = pendingDestinations.has(zone.id);
          const hasRover =
            selectedRover?.currentZoneId === zone.id ||
            rovers.some((r) => r.currentZoneId === zone.id);
          const isDust = dustStormZoneId === zone.id;
          const radius = isBase ? 22 : 16;

          return (
            <g key={zone.id}>
              {(isDest || hasOrder || isDust) && (
                <circle
                  cx={zone.x}
                  cy={zone.y}
                  r={radius + 14}
                  fill="url(#zoneGlow)"
                />
              )}
              <circle
                cx={zone.x}
                cy={zone.y}
                r={radius}
                fill={isBase ? '#1a2a3d' : '#132030'}
                stroke={
                  isDust
                    ? '#e6b85c'
                    : isDest
                      ? '#7ec8e3'
                      : hasOrder
                        ? '#e6b85c'
                        : 'rgba(126,200,227,0.45)'
                }
                strokeWidth={isDest || isDust ? 3 : 1.5}
              />
              {hasRover && (
                <circle
                  cx={zone.x + radius - 4}
                  cy={zone.y - radius + 4}
                  r={5}
                  fill="#6ecf9b"
                  stroke="#0a1018"
                  strokeWidth={1}
                />
              )}
              <text
                x={zone.x}
                y={zone.y + radius + 16}
                textAnchor="middle"
                fill="#e8eef5"
                fontSize="12"
                fontFamily="Space Grotesk, sans-serif"
              >
                {zone.name}
                {isDust ? ' ✦' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
