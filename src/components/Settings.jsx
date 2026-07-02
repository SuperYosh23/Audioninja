import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Download, Upload, Trash2, Check, Image as ImageIcon, Palette, RotateCcw, ChevronDown } from 'lucide-react';
import { storage } from '../utils/storage';
import { extractColorsFromImage, generatePaletteFromSource, applyTheme, loadTheme, applyCurrentTheme, resetTheme } from '../utils/colorScheme';

export const Settings = () => {
  const [preferences, setPreferences] = useState({ theme: 'dark', autoplay: true });
  const [importStatus, setImportStatus] = useState('');
  const importRef = useRef(null);

  const [customTheme, setCustomTheme] = useState(() => loadTheme());
  const [extractedColors, setExtractedColors] = useState([]);
  const [sourceColor, setSourceColor] = useState('');
  const [showThemeSection, setShowThemeSection] = useState(false);
  const imageInputRef = useRef(null);
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    setPreferences(storage.getPreferences());
  }, []);

  const handleToggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    const newPreferences = { ...preferences, theme: newTheme };
    setPreferences(newPreferences);
    storage.savePreferences(newPreferences);
    document.documentElement.dataset.theme = newTheme;
    if (customTheme) applyCurrentTheme(customTheme);
  };

  const handleToggleAutoplay = () => {
    const newPreferences = { ...preferences, autoplay: !preferences.autoplay };
    setPreferences(newPreferences);
    storage.savePreferences(newPreferences);
  };

  const handleExport = () => {
    const data = {
      ym_playlists: localStorage.getItem('ym_playlists'),
      ym_listening_history: localStorage.getItem('ym_listening_history'),
      ym_preferences: localStorage.getItem('ym_preferences'),
      ym_eq_settings: localStorage.getItem('ym_eq_settings'),
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
        const keys = ['ym_playlists', 'ym_listening_history', 'ym_preferences', 'ym_eq_settings'];
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const colors = await extractColorsFromImage(file);
      setExtractedColors(colors);
      if (colors.length > 0) {
        setSourceColor(colors[0]);
        const palette = generatePaletteFromSource(colors[0]);
        setGeneratedPreview(palette);
      }
    } catch (err) {
      console.error('Failed to extract colors:', err);
    } finally {
      setExtracting(false);
    }
    e.target.value = '';
  };

  const handleColorPick = (color) => {
    setSourceColor(color);
    if (color) {
      const palette = generatePaletteFromSource(color);
      setGeneratedPreview(palette);
    } else {
      setGeneratedPreview(null);
    }
  };

  const handleApplyTheme = () => {
    if (!generatedPreview) return;
    applyTheme(generatedPreview);
    setCustomTheme(generatedPreview);
  };

  const handleResetTheme = () => {
    resetTheme();
    setCustomTheme(null);
    setGeneratedPreview(null);
    setSourceColor('');
    setExtractedColors([]);
  };

  const colorSwatches = [sourceColor, ...extractedColors.filter(c => c !== sourceColor)].filter(Boolean);

  return (
    <div className="p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
        <SettingsIcon size={24} />
        Settings
      </h2>

      <div className="space-y-6">
        <div className="bg-surface-container/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {preferences.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span className="text-on-surface">Theme</span>
              </div>
              <button
                onClick={handleToggleTheme}
                className="px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-all hover:scale-105 active:scale-95"
              >
                {preferences.theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-on-surface">Autoplay</span>
              <button
                onClick={handleToggleAutoplay}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.autoplay ? 'bg-primary' : 'bg-surface-container-high'
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

        <div className="bg-surface-container/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">Data Management</h3>
          <p className="text-on-surface-variant text-sm mb-4">
            All your data (playlists, listening history) is stored locally in your browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-on-surface rounded-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
            >
              <Download size={18} />
              Export Data
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all hover:scale-105 active:scale-95"
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
              className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all hover:scale-105 active:scale-95"
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
            <div className={`mt-3 flex items-center gap-2 text-sm animate-slideUp ${importStatus.includes('Refreshing') ? 'text-primary' : 'text-primary'}`}>
              <Check size={16} />
              {importStatus}
            </div>
          )}
        </div>

        {/* Theme Customization */}
        <div className="bg-surface-container/50 rounded-xl p-6">
          <button
            onClick={() => setShowThemeSection(!showThemeSection)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <Palette size={20} />
              Theme Customization
            </h3>
            <ChevronDown size={20} className={`text-on-surface-variant transition-transform ${showThemeSection ? 'rotate-180' : ''}`} />
          </button>

          {showThemeSection && (
            <div className="mt-4 space-y-4 animate-slideUp">
              {customTheme && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm">
                  <Check size={16} />
                  Custom theme is active
                </div>
              )}

              {/* Image upload */}
              <div>
                <p className="text-sm text-on-surface-variant mb-2">Upload an image to extract colors</p>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
                >
                  <ImageIcon size={18} />
                  {extracting ? 'Extracting colors...' : 'Choose Image'}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Extracted color swatches */}
              {colorSwatches.length > 0 && (
                <div>
                  <p className="text-sm text-on-surface-variant mb-2">Choose a color</p>
                  <div className="flex flex-wrap gap-2">
                    {colorSwatches.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => handleColorPick(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          sourceColor === color ? 'border-on-surface scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color picker */}
              <div>
                <p className="text-sm text-on-surface-variant mb-2">Or pick a custom color</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={sourceColor || '#FF8A9B'}
                    onChange={(e) => handleColorPick(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-sm text-on-surface font-mono">{sourceColor || '#FF8A9B'}</span>
                </div>
              </div>

              {/* Palette preview */}
              {generatedPreview && (
                <div>
                  <p className="text-sm text-on-surface-variant mb-2">Generated palette</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Primary', key: 'primary' },
                      { label: 'On Primary', key: 'on-primary' },
                      { label: 'Primary Container', key: 'primary-container' },
                      { label: 'Secondary', key: 'secondary' },
                      { label: 'Secondary Container', key: 'secondary-container' },
                      { label: 'Tertiary', key: 'tertiary' },
                      { label: 'Tertiary Container', key: 'tertiary-container' },
                      { label: 'Surface', key: 'surface' },
                      { label: 'Surface Container', key: 'surface-container' },
                      { label: 'Surface Container High', key: 'surface-container-high' },
                    ].map(({ label, key }) => {
                      const color = generatedPreview.dark[key];
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm text-on-surface flex-1">{label}</span>
                          <span className="text-xs text-on-surface-variant font-mono">{color}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apply / Reset */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApplyTheme}
                  disabled={!generatedPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-surface rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={18} />
                  Apply Theme
                </button>
                <button
                  onClick={handleResetTheme}
                  disabled={!customTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={18} />
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
