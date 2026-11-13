import { describe, expect, it } from 'vitest';
import { createSseParseState, flushSse, pushSseChunk, type StreamEvent } from './sse';

function collect(chunks: string[]) {
  const events: StreamEvent[] = [];
  const state = createSseParseState();
  for (const chunk of chunks) pushSseChunk(state, chunk, (e) => events.push(e));
  flushSse(state, (e) => events.push(e));
  return events;
}

describe('SSE parser', () => {
  it('reassembles events split across TCP chunks', () => {
    const events = collect([
      'event: snapshot\n',
      'data: {"linkStatus":"ACTIVE","change":null}\n',
      '\n',
    ]);
    expect(events).toEqual([{ type: 'snapshot', data: { linkStatus: 'ACTIVE', change: null } }]);
  });

  it('ignores comment pings', () => {
    const events = collect([': ping\n\n', 'event: vehicle\ndata: {"lat":1,"lng":2}\n\n']);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('vehicle');
  });

  it('joins multiline data and skips malformed JSON', () => {
    const events = collect(['event: snapshot\ndata: {not json}\n\n', 'event: vehicle\ndata: {"a":1}\n\n']);
    expect(events).toEqual([{ type: 'vehicle', data: { a: 1 } }]);
  });
});
