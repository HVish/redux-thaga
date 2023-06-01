import {
  PayloadAction,
  Update,
  createEntityAdapter,
  createSlice,
  EntityState,
} from '@reduxjs/toolkit';
import { call, takeLatest } from 'redux-saga/effects';
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
  try {
    yield takeLatest(fetchTasks, fetchTasks.worker);
  } catch (error) {
    console.log(error);
  }
}
