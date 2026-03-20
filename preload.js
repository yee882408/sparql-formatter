const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	storeGet: (key) => ipcRenderer.invoke("store:get", key),
	storeSet: (key, value) => ipcRenderer.invoke("store:set", key, value),
	formatQuery: (query, prefixLines) =>
		ipcRenderer.invoke("sparql:format", query, prefixLines),
	saveFile: (content) => ipcRenderer.invoke("dialog:save", content),
});
