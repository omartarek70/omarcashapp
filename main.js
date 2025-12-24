const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // load the dist folder of your Angular app
  // Try common output locations and load the file directly to avoid URL encoding issues
  const candidates = [
    path.join(__dirname, 'dist', 'erp', 'browser', 'index.html'),
    path.join(__dirname, 'dist', 'erp', 'index.html'),
    path.join(__dirname, 'dist', 'index.html')
  ];

  let targetFile = null;
  for (const p of candidates) {
    try {
      if (require('fs').existsSync(p)) { targetFile = p; break; }
    } catch (e) { }
  }

  if (targetFile) {
    win.loadFile(targetFile).catch(err => console.error('loadFile failed', err));
  } else {
    // fallback to previous behavior
    const fallback = path.join(__dirname, 'dist', 'erp', 'index.html');
    win.loadURL(url.format({ pathname: fallback, protocol: 'file:', slashes: true }));
  }

  // Open DevTools to help diagnose renderer issues (remove for production)
  try {
    win.webContents.openDevTools({ mode: 'right' });
  } catch (e) {}

  // Forward renderer console messages to a log file for offline inspection
  try {
    const fs = require('fs');
    const logDir = path.join(__dirname, 'dist', 'erp');
    const logPath = path.join(logDir, 'renderer-errors.log');
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      try {
        if (!fs.existsSync(logDir)) try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) {}
        fs.appendFileSync(logPath, `[console ${level}] ${message} (${sourceId}:${line})\n`);
      } catch (e) {}
    });
  } catch (e) {}

  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
