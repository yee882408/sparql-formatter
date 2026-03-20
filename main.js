const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const { formatQuery } = require("./formatter");

const store = new Store();

function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		title: "SPARQL Formatter",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

// IPC: 讀取 store
ipcMain.handle("store:get", (_, key) => {
	return store.get(key);
});

// IPC: 寫入 store
ipcMain.handle("store:set", (_, key, value) => {
	store.set(key, value);
});

// IPC: SPARQL 格式化（在 main process 用 sparqljs）
ipcMain.handle("sparql:format", (_, query, prefixLines) => {
	return formatQuery(query, prefixLines);
});

// IPC: 存檔 dialog
ipcMain.handle("dialog:save", async (_, content) => {
	const { canceled, filePath } = await dialog.showSaveDialog({
		title: "儲存 SPARQL Query",
		defaultPath: "query.rq",
		filters: [
			{ name: "SPARQL Query", extensions: ["rq"] },
			{ name: "Text", extensions: ["txt"] },
		],
	});
	if (canceled || !filePath) return { success: false };
	try {
		fs.writeFileSync(filePath, content, "utf-8");
		return { success: true, filePath };
	} catch (err) {
		return { success: false, error: err.message };
	}
});
