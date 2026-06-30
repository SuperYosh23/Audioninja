import { app, BrowserWindow, dialog } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let pythonProcess = null;

const BACKEND_PORT = 5000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'server.py');
  }
  return path.join(process.resourcesPath, 'backend', 'server.py');
}

function getPythonCmd() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function startPythonBackend() {
  const backendPath = getBackendPath();
  const pythonCmd = getPythonCmd();

  pythonProcess = spawn(pythonCmd, [backendPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(BACKEND_PORT) },
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

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'audioNINJA',
    backgroundColor: '#16171d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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

app.whenReady().then(() => {
  startPythonBackend();
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
