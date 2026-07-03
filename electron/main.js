import { app, BrowserWindow, Menu, dialog, desktopCapturer, ipcMain, session } from 'electron';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let pythonProcess = null;

const BACKEND_PORT = 3614;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'server.py');
  }
  return path.join(process.resourcesPath, 'backend', 'server.py');
}

function getPythonCmd() {
  if (isDev) {
    const venvPath = '/tmp/ytmusic-backend/bin/python3';
    if (fs.existsSync(venvPath)) return venvPath;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function getPythonPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'lib');
  }
  return path.join(process.resourcesPath, 'backend', 'lib');
}

function startPythonBackend() {
  const backendPath = getBackendPath();
  const pythonCmd = getPythonCmd();
  const pythonPath = getPythonPath();
  const env = { ...process.env, PORT: String(BACKEND_PORT) };

  if (fs.existsSync(pythonPath)) {
    const existing = env.PYTHONPATH || '';
    env.PYTHONPATH = existing ? `${pythonPath}:${existing}` : pythonPath;
  }

  pythonProcess = spawn(pythonCmd, [backendPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err.message);
    dialog.showErrorBox(
      'Python Not Found',
      `Could not start the music backend.\n\nMake sure Python 3 and ytmusicapi are installed:\n\npip install ytmusicapi flask flask-cors`
    );
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    pythonProcess = null;
  });
}

function waitForBackend(retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    function check(attemptsLeft) {
      const req = http.get(`http://localhost:${BACKEND_PORT}/api/search?q=__ping__`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (attemptsLeft <= 0) {
          reject(new Error(`Backend not reachable on port ${BACKEND_PORT} after ${retries} retries`));
        } else {
          setTimeout(() => check(attemptsLeft - 1), interval);
        }
      });
      req.end();
    }
    check(retries);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);
  const iconPath = path.join(__dirname, '..', isDev ? 'public' : 'dist', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'audioNINJA',
    icon: iconPath,
    backgroundColor: '#16171d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAudioCapture() {
  ipcMain.handle('get-desktop-audio-source', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: false,
      thumbnailSize: { width: 0, height: 0 },
    });
    const ourWindow = sources.find(s => s.name === 'audioNINJA');
    return ourWindow ? { id: ourWindow.id, name: ourWindow.name } : null;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });
}

app.whenReady().then(async () => {
  startPythonBackend();
  setupAudioCapture();

  try {
    await waitForBackend();
    console.log('[main] Backend is ready');
  } catch (err) {
    console.error('[main] Backend failed to start:', err.message);
    dialog.showErrorBox(
      'Backend Not Reachable',
      `Could not connect to the music backend on port ${BACKEND_PORT}.\n\nMake sure Python 3 and the required packages are installed:\n\npip install ytmusicapi flask flask-cors`
    );
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopPythonBackend();
});
