const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let currentFilePath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'EUTYPE - Professionele Tekstverwerker'
  });

  // Development mode: laad van Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: laad van gebouwde files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Helper functie om HTML naar plain text te converteren
function htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// IPC Handlers voor file operaties

// Opslaan (gebruik huidig bestand of vraag locatie)
ipcMain.handle('save-file', async (event, { content, currentPath }) => {
  let filePath = currentPath || currentFilePath;

  // Als er geen huidig pad is, toon Save As dialog
  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Document opslaan',
      defaultPath: 'Document.ty',
      filters: [
        { name: 'EUTYPE Document', extensions: ['ty'] },
        { name: 'Alle bestanden', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    filePath = result.filePath;
  }

  try {
    await fs.writeFile(filePath, content, 'utf-8');
    currentFilePath = filePath;
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Opslaan als (altijd nieuwe locatie vragen)
ipcMain.handle('save-file-as', async (event, { content, format = 'ty' }) => {
  let filters, defaultPath, processedContent;

  // Bepaal filters en default pad op basis van format
  if (format === 'ty') {
    filters = [
      { name: 'EUTYPE Document', extensions: ['ty'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ];
    defaultPath = 'Document.ty';
    processedContent = content; // JSON string
  } else if (format === 'html') {
    filters = [
      { name: 'HTML Document', extensions: ['html', 'htm'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ];
    defaultPath = 'Document.html';
    const data = JSON.parse(content);
    processedContent = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EUTYPE Document</title>
  <style>
    body {
      font-family: 'Calibri', Arial, sans-serif;
      line-height: 1.6;
      max-width: 210mm;
      margin: 20mm auto;
      padding: 20mm;
      background: white;
    }
  </style>
</head>
<body>
  ${data.html}
</body>
</html>`;
  } else if (format === 'txt') {
    filters = [
      { name: 'Plain Text', extensions: ['txt'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ];
    defaultPath = 'Document.txt';
    const data = JSON.parse(content);
    processedContent = data.text || htmlToPlainText(data.html);
  } else if (format === 'docx') {
    filters = [
      { name: 'Word Document', extensions: ['docx'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ];
    defaultPath = 'Document.docx';
    // DOCX export komt later met een library
    return { success: false, error: 'DOCX export wordt binnenkort toegevoegd' };
  }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Opslaan als',
    defaultPath,
    filters
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    await fs.writeFile(filePath, processedContent, 'utf-8');
    if (format === 'ty') {
      currentFilePath = filePath;
    }
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export functie (apart van save as, voor exports)
ipcMain.handle('export-file', async (event, { content, format }) => {
  return ipcMain.invoke('save-file-as', event, { content, format });
});

// Openen dialoog
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Document openen',
    properties: ['openFile'],
    filters: [
      { name: 'EUTYPE Document', extensions: ['ty'] },
      { name: 'HTML Document', extensions: ['html', 'htm'] },
      { name: 'Plain Text', extensions: ['txt'] },
      { name: 'Alle bestanden', extensions: ['*'] }
    ]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const content = await fs.readFile(filePaths[0], 'utf-8');
    currentFilePath = filePaths[0].endsWith('.ty') ? filePaths[0] : null;
    return { success: true, content, filePath: filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export naar PDF
ipcMain.handle('export-pdf', async (event, htmlContent) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporteren als PDF',
    defaultPath: 'Document.pdf',
    filters: [
      { name: 'PDF Document', extensions: ['pdf'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    // Maak een tijdelijk HTML bestand
    const tempHtmlPath = path.join(app.getPath('temp'), 'print-temp.html');
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2.5cm 1.9cm;
    }
    body {
      font-family: Calibri, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
    }
    h1 { font-size: 20pt; color: #2E74B5; }
    h2 { font-size: 16pt; color: #2E74B5; }
    h3 { font-size: 14pt; color: #1F4D78; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #BDD7EE; padding: 8px; }
    th { background-color: #4472C4; color: white; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    await fs.writeFile(tempHtmlPath, htmlTemplate, 'utf-8');

    // Maak een verborgen BrowserWindow voor printen
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    });

    await printWindow.loadFile(tempHtmlPath);

    // Print naar PDF
    const pdfData = await printWindow.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 2.5,
        bottom: 2.5,
        left: 1.9,
        right: 1.9
      },
      printBackground: true
    });

    await fs.writeFile(filePath, pdfData);
    printWindow.close();

    // Verwijder temp bestand
    await fs.unlink(tempHtmlPath);

    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
