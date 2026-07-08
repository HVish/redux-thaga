# Redux thaga

[![npm version](https://img.shields.io/npm/v/@hvish/redux-thaga.svg)](https://www.npmjs.com/package/@hvish/redux-thaga)
[![npm downloads](https://img.shields.io/npm/dm/@hvish/redux-thaga.svg)](https://www.npmjs.com/package/@hvish/redux-thaga)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@hvish/redux-thaga)](https://bundlephobia.com/package/@hvish/redux-thaga)
[![license](https://img.shields.io/npm/l/@hvish/redux-thaga.svg)](https://github.com/HVish/redux-thaga/blob/main/LICENSE)
[![tests](https://github.com/HVish/redux-thaga/actions/workflows/tests.yml/badge.svg)](https://github.com/HVish/redux-thaga/actions/workflows/tests.yml)

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
      const tasks = await dispatch(fetchTasks());
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

## Typed dispatch

Importing anything from `@hvish/redux-thaga` augments Redux's `Dispatch` (and
redux-thunk's `ThunkDispatch`, which `configureStore` uses by default), so
dispatching a thaga action returns a fully typed `ThagaPromise` — no casts and
no store wiring required:

```ts
const dispatch = useDispatch();

const tasks = await dispatch(fetchTasks()); // inferred as Task[]
dispatch(fetchTasks()).cancel('user navigated away'); // ThagaPromise<Task[]>
```

Typed hooks (`useDispatch<AppDispatch>()`) work the same way. Under the hood
the worker's return type rides along on the initiator action via the phantom
`THAGA_RETURN` property (see `ThagaInitiatorAction`) — nothing extra exists at
runtime. The augmentation needs `redux` and `redux-thunk` to be resolvable by
TypeScript; both are declared as peer dependencies, so a regular install
already satisfies this (including under pnpm and Yarn PnP).

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
  THAGA_RETURN,
  ThagaCancelledError,
  ThagaTimeoutError,
} from '@hvish/redux-thaga';
import type {
  CreateThagaActionOptions,
  CreateThagaMiddlewareOptions,
  SerializedError,
  ThagaInitiatorAction,
  ThagaMetaData,
  ThagaPromise,
} from '@hvish/redux-thaga';
```
