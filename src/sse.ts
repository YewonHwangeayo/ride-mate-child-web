import type { Snapshot, VehicleEvent } from './types';
import { API_BASE, ApiError } from './api';

export type StreamEvent = { type: 'snapshot'; data: Snapshot } | { type: 'vehicle'; data: VehicleEvent };

export type SseParseState = { buffer: string; eventName: string; data: string[] };

export function createSseParseState(): SseParseState {
  return { buffer: '', eventName: '', data: [] };
}

function dispatch(state: SseParseState, onEvent: (e: StreamEvent) => void) {
  if (state.data.length && (state.eventName === 'snapshot' || state.eventName === 'vehicle')) {
    try {
      onEvent({ type: state.eventName, data: JSON.parse(state.data.join('\n')) } as StreamEvent);
    } catch {
      // Ignore a malformed event; keep the stream.
    }
  }
  state.eventName = '';
  state.data = [];
}

function processLine(state: SseParseState, line: string, onEvent: (e: StreamEvent) => void) {
  if (line === '') {
    dispatch(state, onEvent);
    return;
  }
  if (line.startsWith(':')) return;
  const sep = line.indexOf(':');
  const field = sep < 0 ? line : line.slice(0, sep);
  let value = sep < 0 ? '' : line.slice(sep + 1);
  if (value.startsWith(' ')) value = value.slice(1);
  if (field === 'event') state.eventName = value;
  if (field === 'data') state.data.push(value);
}

export function pushSseChunk(state: SseParseState, chunk: string, onEvent: (e: StreamEvent) => void) {
  state.buffer += chunk;
  let i = state.buffer.indexOf('\n');
  while (i >= 0) {
    let line = state.buffer.slice(0, i);
    state.buffer = state.buffer.slice(i + 1);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    processLine(state, line, onEvent);
    i = state.buffer.indexOf('\n');
  }
}

export function flushSse(state: SseParseState, onEvent: (e: StreamEvent) => void) {
  if (state.buffer) processLine(state, state.buffer, onEvent);
  dispatch(state, onEvent);
}

export async function consumeSse(token: string, signal: AbortSignal, onEvent: (e: StreamEvent) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/Pickup/W/DetailChildPickupStream`, {
    headers: { 'X-Pickup-Token': token, Accept: 'text/event-stream' },
    cache: 'no-store',
    signal,
  });
  const retryAfter = Number(res.headers.get('Retry-After')) || null;
  if (!res.ok) throw new ApiError(res.status, res.status, `실시간 연결 오류 (${res.status})`, retryAfter);
  const contentType = res.headers.get('Content-Type') || '';
  if (!contentType.includes('text/event-stream')) {
    throw new ApiError(res.status, res.status, '실시간 연결 형식이 올바르지 않아요.', retryAfter);
  }
  if (!res.body) throw new Error('SSE 응답 본문이 없습니다.');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const state = createSseParseState();
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      pushSseChunk(state, decoder.decode(value, { stream: true }), onEvent);
    }
    pushSseChunk(state, decoder.decode(), onEvent);
    flushSse(state, onEvent);
  } finally {
    reader.releaseLock();
  }
}
