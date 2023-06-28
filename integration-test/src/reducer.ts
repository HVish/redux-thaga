import {
  PayloadAction,
  Update,
  createEntityAdapter,
  createSlice,
  EntityState,
} from '@reduxjs/toolkit';
import { call, fork, take } from 'redux-saga/effects';
import { createThagaAction } from '@hvish/redux-thaga';
import { delay } from './uitls';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
}

const taskAdapter = createEntityAdapter<Task>();

export const allTasksSelector = (state: { tasks: EntityState<Task> }) =>
  taskAdapter.getSelectors().selectAll(state.tasks);

const taskApi = async (shouldFail: boolean) => {
  const response = await fetch('/tasks.json');
  const tasks: Task[] = await response.json();
  await delay(2000);
  if (shouldFail) throw new Error('Test error');
  return tasks;
};

export const fetchTasks = createThagaAction(
  'fetchTasks',
  function* fetchTasksWorker({ shouldFail }: { shouldFail: boolean }) {
    const tasks = (yield call(taskApi, shouldFail)) as Task[];
    return tasks;
  }
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
  yield fork(function* () {
    while (true) {
      try {
        const action: ReturnType<typeof fetchTasks> = yield take(fetchTasks);
        yield call(fetchTasks.worker, action);
      } catch (error) {
        console.log(error);
      }
    }
  });
}
