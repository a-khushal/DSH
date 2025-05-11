import { useEffect, useState } from 'react';
import './index.css';
import { Power, Settings, DollarSign, Activity, Shield } from 'lucide-react';

async function getIPAddress(): Promise<string | undefined> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip.toString();
  } catch (error) {
    console.error("Error fetching IP address:", error);
  }
}

function App() {
  const [isActive, setIsActive] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [bandwidth, setBandwidth] = useState(0);
  const [ipAddress, setIPAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isActive) {
      getIPAddress().then(ip => setIPAddress(ip));
    }
  }, [isActive]);

  return (
    <div className="w-[350px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-purple-600" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            MeshMint
          </span>
        </div>
        <button 
          className="text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Status: {isActive ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {isActive && ipAddress && (
          <div className="mb-3 px-3 py-2 bg-slate-700 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Current IP Address:</div>
            <div className="text-sm font-mono text-purple-400">{ipAddress}</div>
          </div>
        )}
        <button
          onClick={() => setIsActive(!isActive)}
          className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors ${
            isActive
              ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
              : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/30'
          }`}
        >
          <Power size={18} />
          <span className="font-medium">{isActive ? 'Stop Sharing' : 'Start Sharing'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign size={16} className="text-purple-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Earnings</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            ${earnings.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={16} className="text-teal-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Bandwidth</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {bandwidth.toFixed(1)} GB
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
          Today's Activity
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Uptime</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">2h 15m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Requests Served</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">1,234</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Network Score</span>
            <span className="text-sm font-medium text-green-600">98%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <a 
          href="#" 
          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Dashboard
        </a>
      </div>
    </div>
  );
}

export default App;