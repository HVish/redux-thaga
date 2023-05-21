import { useDispatch, useSelector } from 'react-redux';
import { Task, allTasksSelector, fetchTasks } from './reducer';

function App() {
  const tasks = useSelector(allTasksSelector);
  const dispatch = useDispatch();

  const onClick = (shouldFail: boolean) => async () => {
    try {
      const tasks = (await dispatch(
        fetchTasks({ shouldFail })
      )) as unknown as Task[];
      console.log(tasks);
    } catch (error) {
      console.log('unable to fetch tasks');
    }
  };

  return (
    <div>
      <button onClick={onClick(false)}>Fetch Tasks (Success)</button>
      <button onClick={onClick(true)}>Fetch Tasks (Failure)</button>
      {tasks.map((task) => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}

export default App;
