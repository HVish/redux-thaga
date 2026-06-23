import {
  PayloadAction,
  Update,
  createEntityAdapter,
  createSlice,
  EntityState,
} from '@reduxjs/toolkit';
import { all, call, takeLatest } from 'redux-saga/effects';
import { createThagaAction } from '@hvish/redux-thaga';
import { delay } from './uitls';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
}

const taskAdapter = createEntityAdapter<Task>();

export const allTasksSelector = (state: { tasks: EntityState<Task, string> }) =>
  taskAdapter.getSelectors().selectAll(state.tasks);

const taskApi = async (shouldFail: boolean) => {
  const response = await fetch('/tasks.json');
  const tasks: Task[] = await response.json();
  await delay(2000);
  if (shouldFail) throw new Error('Test error: API rejected the request');
  return tasks;
};

export const fetchTasks = createThagaAction(
  'fetchTasks',
  function* fetchTasksWorker({ shouldFail }: { shouldFail: boolean }) {
    const tasks = (yield call(taskApi, shouldFail)) as Task[];
    return tasks;
  },
);

/**
 * Manual-test thaga that takes ~5s on purpose. Configured with a per-action
 * timeoutMs of 1500ms so dispatching it always rejects with `ThagaTimeoutError`.
 */
export const slowFetchTasks = createThagaAction(
  'slowFetchTasks',
  function* slowWorker() {
    yield call(delay, 5000);
    return [] as Task[];
  },
  { timeoutMs: 1500 },
);

export const { actions, reducer: tasksReducer } = createSlice({
  name: 'tasks',
  initialState: taskAdapter.getInitialState(),
  reducers: {
    addTask(state, action: PayloadAction<Task>) {
      taskAdapter.addOne(state, action.payload);
    },
    updateTask(state, action: PayloadAction<Update<Task, string>>) {
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
  // `takeLatest` cancels the previous worker if a new dispatch lands. That's
  // what makes the manual "Cancel In-Flight" demo actually stop the saga work
  // (vs. just rejecting the caller's Promise).
  yield all([
    takeLatest(fetchTasks, fetchTasks.worker),
    takeLatest(slowFetchTasks, slowFetchTasks.worker),
  ]);
}
