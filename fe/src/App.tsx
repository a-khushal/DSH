import { useEffect, useState } from 'react';
import { Power, Settings, DollarSign, Activity, Shield, LogOut, Wifi, WifiOff } from 'lucide-react';
import './index.css';

interface User {
  id: string;
  email: string;
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

  const [isActive, setIsActive] = useState(false);
  const [ipAddress, setIPAddress] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
              setUser({ id: payload.userId, email: '' });
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
      const endpoint = showSignUp ? '/api/auth/signup' : '/api/auth/signin';
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
          <button 
            className="text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
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
      </div>
    </div>
  );
}

export default App;