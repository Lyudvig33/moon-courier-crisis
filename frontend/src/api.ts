import axios from 'axios';
import type {
  DeliveryPreview,
  DeliveryResult,
  GameEvent,
  GameSummary,
  NextDayResult,
  Order,
  Rover,
  Route,
  Zone,
} from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchGame(): Promise<GameSummary> {
  const { data } = await api.get<GameSummary>('/game');
  return data;
}

export async function createGame(): Promise<GameSummary> {
  const { data } = await api.post<GameSummary>('/game');
  return data;
}

export async function fetchMap(): Promise<{ zones: Zone[]; routes: Route[] }> {
  const { data } = await api.get<{ zones: Zone[]; routes: Route[] }>('/game/map');
  return data;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/game/orders');
  return data;
}

export async function fetchRovers(): Promise<Rover[]> {
  const { data } = await api.get<Rover[]>('/game/rovers');
  return data;
}

export async function fetchEvents(): Promise<GameEvent[]> {
  const { data } = await api.get<GameEvent[]>('/game/events');
  return data;
}

export async function nextDay(): Promise<NextDayResult> {
  const { data } = await api.post<NextDayResult>('/game/next-day');
  return data;
}

export async function previewDelivery(
  orderId: string,
  roverId: string,
): Promise<DeliveryPreview> {
  const { data } = await api.post<DeliveryPreview>('/deliveries/preview', {
    orderId,
    roverId,
  });
  return data;
}

export async function startDelivery(
  orderId: string,
  roverId: string,
): Promise<DeliveryResult> {
  const { data } = await api.post<DeliveryResult>('/deliveries', {
    orderId,
    roverId,
  });
  return data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; code?: string }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
