# Redux thaga

![tests](https://github.com/HVish/redux-thaga/actions/workflows/tests.yml/badge.svg)

This redux middleware enhances redux-saga with redux-thunk capabilites.

> **Requires `@reduxjs/toolkit` v2+** and `redux-saga` v1+.

## Usage

```ts
// file: reducer.ts
import {
  PayloadAction,
  Update,
  createEntityAdapter,
  createSlice,
  EntityState,
} from '@reduxjs/toolkit';
import { call, takeLatest } from 'redux-saga/effects';
import { createThagaAction } from '@hvish/redux-thaga';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
}

const taskAdapter = createEntityAdapter<Task>();

export const allTasksSelector = (state: { tasks: EntityState<Task> }) =>
  taskAdapter.getSelectors().selectAll(state.tasks);

const taskApi = async () => {
  const response = await fetch('/tasks.json');
  const tasks: Task[] = await response.json();
  return tasks;
};

export const fetchTasks = createThagaAction(
  'fetchTasks',
  function* fetchTasksWorker() {
    // arguments: (actionPayload, action, ...restArgs)
    const tasks = (yield call(taskApi)) as Task[];
    return tasks;
  },
);

export const { actions, reducer: tasksReducer } = createSlice({
  name: 'tasks',
  initialState: taskAdapter.getInitialState(),
  reducers: {
    addTask(state, action: PayloadAction<Task>) {
      taskAdapter.addOne(state, action.payload);
    },
    updateTask(state, action: PayloadAction<Update<Task>>) {
      taskAdapter.updateOne(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTasks.finished, (state, action) => {
      taskAdapter.addMany(state, action.payload);
    });
  },
});

export function* tasksWorker() {
  try {
    yield takeLatest(fetchTasks, fetchTasks.worker);
  } catch (error) {
    console.log(error);
  }
}
```

```ts
// file: store.ts
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { createThagaMiddleware } from '@hvish/redux-thaga';

import { tasksWorker, tasksReducer } from './reducer';

const sagaMiddleware = createSagaMiddleware();
const thagaMiddleware = createThagaMiddleware();

export const store = configureStore({
  reducer: { tasks: tasksReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware, thagaMiddleware),
});

sagaMiddleware.run(tasksWorker);
```

```tsx
// file: App.tsx
import { useDispatch, useSelector } from 'react-redux';
import { Task, allTasksSelector, fetchTasks } from './reducer';

function App() {
  const tasks = useSelector(allTasksSelector);
  const dispatch = useDispatch();

  const onClick = async () => {
    try {
      const tasks = (await dispatch(fetchTasks())) as unknown as Task[];
      console.log(tasks);
    } catch (error) {
      console.log('unable to fetch tasks');
    }
  };

  return (
    <div>
      <button onClick={onClick}>Fetch Tasks</button>
      {tasks.map((task) => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}

export default App;
```

## API

### `createThagaMiddleware(options?)`

Creates redux middleware that turns each thaga dispatch into a Promise.

Options:

- `getId?: () => string` — correlation id generator.
- `timeoutMs?: number` — default per-action timeout. Per-action `timeoutMs` (set on `createThagaAction`) takes precedence. No timeout by default.

### `createThagaAction(type, worker, options?)`

Creates a thaga action creator (extends redux-toolkit's `createAction`).

- `type` — action type string.
- `worker` — generator called with `(payload, action, ...extraArgs)` when the action is dispatched (via your saga, e.g. `takeLatest(action, action.worker)`).
- `options.timeoutMs?: number` — per-action timeout in ms; overrides middleware default.

#### Action creator properties

- `type`, `match()`, `toString()` — inherited from `createAction`.
- `worker` — saga worker to run on dispatch.
- `finished(result, initiator)` — emitted when the worker resolves; `payload` is the worker's return value.
- `failed(initiator, error)` — emitted when the worker throws; `payload` is the **serialized error**.
- `cancelled(initiator, reason?)` — emitted on cancellation; `payload` is the reason (or `undefined`).

### Returned Promise

`dispatch(thagaAction(payload))` returns a `ThagaPromise<T>`:

- Resolves with the worker's return value on `finished`.
- Rejects with `SerializedError` on `failed`.
- Rejects with `ThagaCancelledError` (carrying `.reason`) on `cancelled`.
- Rejects with `ThagaTimeoutError` if a timeout elapses.
- `.cancel(reason?)` — dispatches a `cancelled` action with the same id and rejects the promise. The saga worker keeps running unless your saga handles cancellation (e.g. via `takeLatest` or `race`).

### Exports

```ts
import {
  createThagaAction,
  createThagaMiddleware,
  isThagaAction,
  serializeError,
  ThagaCancelledError,
  ThagaTimeoutError,
} from '@hvish/redux-thaga';
import type {
  CreateThagaActionOptions,
  CreateThagaMiddlewareOptions,
  SerializedError,
  ThagaMetaData,
  ThagaPromise,
} from '@hvish/redux-thaga';
```
