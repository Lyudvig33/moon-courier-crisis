import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  createGame,
  fetchEvents,
  fetchGame,
  fetchMap,
  fetchOrders,
  fetchRovers,
  getErrorMessage,
  nextDay,
  previewDelivery,
  startDelivery,
} from './api';
import { DeliveryModal } from './components/DeliveryModal';
import { DeliveryPreviewPanel } from './components/DeliveryPreviewPanel';
import { GameOverScreen } from './components/GameOverScreen';
import { Hud } from './components/Hud';
import { LunarMap } from './components/LunarMap';
import { OrderPanel } from './components/OrderPanel';
import { RoverStrip } from './components/RoverStrip';
import type { DeliveryResult } from './types';

export default function App() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRoverId, setSelectedRoverId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'launching' | 'result'>('idle');
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const gameQuery = useQuery({ queryKey: ['game'], queryFn: fetchGame });
  const mapQuery = useQuery({ queryKey: ['map'], queryFn: fetchMap });
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const roversQuery = useQuery({ queryKey: ['rovers'], queryFn: fetchRovers });
  const eventsQuery = useQuery({ queryKey: ['events'], queryFn: fetchEvents });

  const previewQuery = useQuery({
    queryKey: ['preview', selectedOrderId, selectedRoverId],
    queryFn: () => previewDelivery(selectedOrderId!, selectedRoverId!),
    enabled: Boolean(selectedOrderId && selectedRoverId),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['game'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['rovers'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['map'] }),
      queryClient.invalidateQueries({ queryKey: ['preview'] }),
    ]);
  };

  const clearDeliveryUi = () => {
    setPhase('idle');
    setResult(null);
    setSelectedOrderId(null);
    setSelectedRoverId(null);
  };

  const launchMutation = useMutation({
    mutationFn: () => startDelivery(selectedOrderId!, selectedRoverId!),
    onMutate: () => {
      setPhase('launching');
      setResult(null);
    },
    onSuccess: async (data) => {
      await new Promise((r) => setTimeout(r, 1100));
      setResult(data);
      setPhase('result');
      setSelectedOrderId(null);
      setSelectedRoverId(null);
      await invalidateAll();
    },
    onError: (err) => {
      setPhase('idle');
      setToast(getErrorMessage(err));
    },
  });

  const nextDayMutation = useMutation({
    mutationFn: nextDay,
    onSuccess: async (data) => {
      if (data.event) {
        setToast(`${data.event.title}: ${data.event.description}`);
      }
      clearDeliveryUi();
      await invalidateAll();
    },
    onError: (err) => setToast(getErrorMessage(err)),
  });

  const playAgainMutation = useMutation({
    mutationFn: createGame,
    onSuccess: async () => {
      clearDeliveryUi();
      setToast(null);
      await invalidateAll();
    },
    onError: (err) => setToast(getErrorMessage(err)),
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const game = gameQuery.data;
  const gameFinished = game != null && game.status !== 'ACTIVE';
  const zones = mapQuery.data?.zones ?? [];
  const routes = mapQuery.data?.routes ?? [];
  const orders = ordersQuery.data ?? [];
  const rovers = roversQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  useEffect(() => {
    if (gameFinished) {
      setPhase('idle');
      setResult(null);
    }
  }, [gameFinished]);

  if (gameQuery.isLoading || mapQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-[var(--accent)]">Initializing lunar base…</p>
      </div>
    );
  }

  if (gameQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="panel max-w-md p-6">
          <p className="font-display text-[var(--danger)]">Cannot reach API</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{getErrorMessage(gameQuery.error)}</p>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const panelError =
    (mapQuery.isError && getErrorMessage(mapQuery.error)) ||
    (ordersQuery.isError && getErrorMessage(ordersQuery.error)) ||
    (roversQuery.isError && getErrorMessage(roversQuery.error)) ||
    null;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-4 md:p-6">
      <Hud
        game={game}
        onNextDay={() => nextDayMutation.mutate()}
        nextDayLoading={nextDayMutation.isPending}
      />

      {panelError && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          Failed to load game data: {panelError}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col gap-4">
          <LunarMap
            zones={zones}
            routes={routes}
            orders={orders}
            rovers={rovers}
            selectedOrderId={selectedOrderId}
            selectedRoverId={selectedRoverId}
            dustStormZoneId={game.dustStormZoneId}
          />
          {selectedOrderId && selectedRoverId && game.status === 'ACTIVE' && (
            <DeliveryPreviewPanel
              preview={previewQuery.data}
              loading={previewQuery.isFetching}
              errorMessage={
                previewQuery.isError ? getErrorMessage(previewQuery.error) : null
              }
              canLaunch={Boolean(previewQuery.data?.possible) && !previewQuery.isError}
              launching={launchMutation.isPending || phase === 'launching'}
              onLaunch={() => launchMutation.mutate()}
            />
          )}
          {events[0] && (
            <div className="panel px-4 py-3 text-sm">
              <span className="font-display text-xs text-[var(--warn)]">LATEST EVENT · </span>
              <span className="font-semibold">{events[0].title}</span>
              <span className="text-[var(--muted)]"> — {events[0].description}</span>
            </div>
          )}
        </div>
        <OrderPanel
          orders={orders}
          selectedOrderId={selectedOrderId}
          onSelect={setSelectedOrderId}
        />
      </div>

      <RoverStrip
        rovers={rovers}
        selectedRoverId={selectedRoverId}
        onSelect={setSelectedRoverId}
      />

      {!gameFinished && (
        <DeliveryModal
          phase={phase}
          result={result}
          onClose={() => {
            setPhase('idle');
            setResult(null);
          }}
        />
      )}

      {gameFinished && (
        <GameOverScreen
          game={game}
          onPlayAgain={() => playAgainMutation.mutate()}
          loading={playAgainMutation.isPending}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-40 max-w-lg -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
