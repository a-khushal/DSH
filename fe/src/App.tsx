import { useEffect, useState } from 'react';
import { DollarSign, Activity, Shield, LogOut, Wifi, WifiOff, Plus } from 'lucide-react';
import './index.css';

interface User {
  id: string;
  email: string;
  isAdmin?: boolean;
}

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

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [_isActive, setIsActive] = useState(false);
  const [ipAddress, setIPAddress] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Admin states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('NORMAL');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    const loadConnectionState = async () => {
      const { isConnected: savedConnection, ipAddress: savedIP } = await chrome.storage.local.get(['isConnected', 'ipAddress']);
      if (savedConnection) {
        setIsConnected(true);
        setIPAddress(savedIP);
        setIsActive(true);
      }
    };
    loadConnectionState();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { token } = await chrome.storage.local.get('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp > currentTime) {
              setIsSignedIn(true);
              setUser({ id: payload.userId, email: '', isAdmin: payload.isAdmin });
              if (payload.isAdmin) {
                fetchTasks();
              }
            } else {
              await chrome.storage.local.remove('token');
            }
          } catch (error) {
            await chrome.storage.local.remove('token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    checkAuth();
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
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTask(true);
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
      setIsCreatingTask(false);
    }
  };

  const getIPAddress = async (): Promise<string | undefined> => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip.toString();
    } catch (error) {
      console.error("Error fetching IP address:", error);
      return undefined;
    }
  };

  const handleConnection = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      if (!isConnected) {
        const ip = await getIPAddress();
        if (ip) {
          setIPAddress(ip);
          setIsConnected(true);
          setIsActive(true);
          await chrome.storage.local.set({ 
            isConnected: true,
            ipAddress: ip
          });
        } else {
          throw new Error('Failed to get IP address');
        }
      } else {
        setIPAddress(undefined);
        setIsConnected(false);
        setIsActive(false);
        await chrome.storage.local.remove(['isConnected', 'ipAddress']);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (showSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = showSignUp ? '/api/users/signup' : '/api/users/signin';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        await chrome.storage.local.set({ token: data.token });
        setUser(data.user);
        setIsSignedIn(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await chrome.storage.local.remove('token');
      setIsSignedIn(false);
      setUser(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="w-[350px] h-[500px] flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="w-[350px] h-[500px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center space-x-2 mb-8">
            <Shield className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
              MeshMint
            </span>
          </div>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
            Share your bandwidth and earn rewards for helping the network
          </p>
          <form onSubmit={handleAuth} className="w-full space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
                minLength={6}
              />
            </div>
            {showSignUp && (
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>
            )}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (showSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>
          <button
            onClick={() => {
              setShowSignUp(!showSignUp);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="mt-4 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            {showSignUp ? 'Already have an account? Sign in' : 'New user? Sign up'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[350px] h-[500px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-purple-600" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            MeshMint
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleLogout}
            className="text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {user?.isAdmin ? (
          <>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
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
                  disabled={isCreatingTask}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Plus size={20} />
                  <span>{isCreatingTask ? 'Creating...' : 'Create Task'}</span>
                </button>
              </form>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
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
          </>
        ) : (
          <>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Status</span>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
                <button
                  onClick={handleConnection}
                  disabled={isConnecting}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    isConnected
                      ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800'
                      : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800'
                  } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      {isConnected ? <WifiOff size={16} /> : <Wifi size={16} />}
                      <span>{isConnected ? 'Disconnect' : 'Connect'}</span>
                    </>
                  )}
                </button>
              </div>
              
              {isConnected && ipAddress && (
                <div className="mt-2 p-3 bg-white dark:bg-slate-700 rounded-md animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <Wifi className="text-green-500" size={16} />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Connected IP: <span className="font-mono bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">{ipAddress}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {!isConnected && !isConnecting && (
                <div className="mt-2 p-3 bg-white dark:bg-slate-700 rounded-md animate-fadeIn">
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                    <WifiOff className="text-red-500" size={16} />
                    <span>Click connect to start sharing bandwidth</span>
                  </p>
                </div>
              )}

              {connectionError && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-md animate-shake">
                  <p className="text-sm">{connectionError}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Earnings</span>
                </div>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Bandwidth</span>
                </div>
                <p className="text-2xl font-bold">0 MB</p>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-sm font-medium mb-2">Recent Activity</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No recent activity
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;