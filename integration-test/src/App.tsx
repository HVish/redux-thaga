import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ThagaCancelledError,
  ThagaTimeoutError,
  ThagaPromise,
  SerializedError,
} from '@hvish/redux-thaga';
import { Task, allTasksSelector, fetchTasks, slowFetchTasks } from './reducer';
import type { AppDispatch } from './store';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'pending'; label: string }
  | { kind: 'success'; label: string; count: number }
  | { kind: 'failed'; label: string; error: SerializedError }
  | { kind: 'cancelled'; label: string; reason: unknown }
  | { kind: 'timeout'; label: string; ms: number };

function describe(o: Outcome): string {
  switch (o.kind) {
    case 'idle':
      return 'idle — click a button';
    case 'pending':
      return `${o.label}: in flight…`;
    case 'success':
      return `${o.label}: resolved with ${o.count} tasks`;
    case 'failed':
      return `${o.label}: rejected with ${o.error.name ?? 'Error'}: ${o.error.message ?? ''}`;
    case 'cancelled':
      return `${o.label}: ThagaCancelledError (reason=${JSON.stringify(o.reason)})`;
    case 'timeout':
      return `${o.label}: ThagaTimeoutError after ${o.ms}ms`;
  }
}

function App() {
  const tasks = useSelector(allTasksSelector);
  const dispatch = useDispatch<AppDispatch>();
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [inFlight, setInFlight] = useState<ThagaPromise<unknown> | null>(null);

  const handle = async (
    label: string,
    promise: ThagaPromise<unknown>,
  ): Promise<void> => {
    setOutcome({ kind: 'pending', label });
    setInFlight(promise);
    try {
      const result = (await promise) as Task[];
      setOutcome({ kind: 'success', label, count: result.length });
    } catch (error) {
      if (error instanceof ThagaCancelledError) {
        setOutcome({ kind: 'cancelled', label, reason: error.reason });
      } else if (error instanceof ThagaTimeoutError) {
        setOutcome({ kind: 'timeout', label, ms: error.timeoutMs });
      } else {
        setOutcome({
          kind: 'failed',
          label,
          error: error as SerializedError,
        });
      }
    } finally {
      setInFlight(null);
    }
  };

  const onSuccess = () =>
    handle('Success', dispatch(fetchTasks({ shouldFail: false })));

  const onFailure = () =>
    handle('Failure', dispatch(fetchTasks({ shouldFail: true })));

  const onSlow = () =>
    handle('Slow (per-action timeoutMs=1500)', dispatch(slowFetchTasks()));

  const onCancel = () => {
    if (inFlight) inFlight.cancel('user clicked cancel');
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 720 }}>
      <h1>redux-thaga v1 manual tests</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onSuccess}>Fetch Tasks (Success)</button>
        <button onClick={onFailure}>Fetch Tasks (Failure — real error)</button>
        <button onClick={onSlow}>Slow Fetch (per-action timeout)</button>
        <button
          onClick={onCancel}
          disabled={!inFlight}
          style={{ marginLeft: 'auto' }}
        >
          Cancel In-Flight (.cancel)
        </button>
      </div>

      <p
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 4,
          fontFamily: 'monospace',
        }}
      >
        {describe(outcome)}
      </p>

      <h3>Tasks in store</h3>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
