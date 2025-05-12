import { useEffect, useState } from 'react';
import { Shield, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  targetUrl: string;
  priority: string;
  status: string;
  createdAt: string;
  proxyIP?: {
    ipAddress: string;
  };
}

function Admin() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('NORMAL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { token } = await chrome.storage.local.get('token');
      const response = await fetch('http://localhost:5000/api/tasks/admin/tasks', {
        headers: {
          'Authorization': token
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        navigate('/');
      }
    } catch (error) {
      setError('Failed to fetch tasks');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { token } = await chrome.storage.local.get('token');
      const response = await fetch('http://localhost:5000/api/tasks/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          targetUrl: newTaskUrl,
          priority: newTaskPriority
        })
      });

      if (response.ok) {
        setNewTaskUrl('');
        setNewTaskPriority('NORMAL');
        fetchTasks();
      } else {
        setError('Failed to create task');
      }
    } catch (error) {
      setError('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <input
                type="url"
                value={newTaskUrl}
                onChange={(e) => setNewTaskUrl(e.target.value)}
                placeholder="Target URL"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                required
              />
            </div>
            <div>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="LOW">Low Priority</option>
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>{isLoading ? 'Creating...' : 'Create Task'}</span>
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.targetUrl}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Priority: {task.priority} | Status: {task.status}
                    </p>
                  </div>
                  {task.proxyIP && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      IP: {task.proxyIP.ipAddress}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                No tasks found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;