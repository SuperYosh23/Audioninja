import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Download, Upload, Trash2, Check } from 'lucide-react';
import { storage } from '../utils/storage';

export const Settings = () => {
  const [preferences, setPreferences] = useState({ theme: 'dark', autoplay: true });
  const [importStatus, setImportStatus] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    setPreferences(storage.getPreferences());
  }, []);

  const handleToggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    const newPreferences = { ...preferences, theme: newTheme };
    setPreferences(newPreferences);
    storage.savePreferences(newPreferences);
    document.documentElement.dataset.theme = newTheme;
  };

  const handleToggleAutoplay = () => {
    const newPreferences = { ...preferences, autoplay: !preferences.autoplay };
    setPreferences(newPreferences);
    storage.savePreferences(newPreferences);
  };

  const handleExport = () => {
    const data = {
      ym_playlists: localStorage.getItem('ym_playlists'),
      ym_followed_artists: localStorage.getItem('ym_followed_artists'),
      ym_listening_history: localStorage.getItem('ym_listening_history'),
      ym_preferences: localStorage.getItem('ym_preferences'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audioninja-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const keys = ['ym_playlists', 'ym_followed_artists', 'ym_listening_history', 'ym_preferences'];
        let count = 0;
        keys.forEach(key => {
          if (data[key] !== undefined) {
            localStorage.setItem(key, data[key]);
            count++;
          }
        });
        setImportStatus(`Imported ${count} data sections. Refreshing...`);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportStatus('Invalid file. Please select a valid export file.');
        setTimeout(() => setImportStatus(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <SettingsIcon size={24} />
        Settings
      </h2>

      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {preferences.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span className="text-white">Theme</span>
              </div>
              <button
                onClick={handleToggleTheme}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all hover:scale-105 active:scale-95"
              >
                {preferences.theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white">Autoplay</span>
              <button
                onClick={handleToggleAutoplay}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.autoplay ? 'bg-red-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-all ${
                    preferences.autoplay ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
          <p className="text-gray-400 text-sm mb-4">
            All your data (playlists, followed artists, listening history) is stored locally in your browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
            >
              <Download size={18} />
              Export Data
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
            >
              <Upload size={18} />
              Import Data
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
            >
              <Trash2 size={18} />
              Clear All Data
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          {importStatus && (
            <div className={`mt-3 flex items-center gap-2 text-sm animate-slideUp ${importStatus.includes('Refreshing') ? 'text-green-400' : 'text-red-400'}`}>
              <Check size={16} />
              {importStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
