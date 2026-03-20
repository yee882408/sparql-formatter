/**
 * 主入口：初始化各模組、接線格式化邏輯
 */

const elInput = document.getElementById("input-query");
const elOutput = document.getElementById("output-query");
const elStatus = document.getElementById("status-msg");

let debounceTimer = null;

function setStatus(msg, type = "normal") {
	elStatus.textContent = msg;
	elStatus.style.color =
		type === "error"
			? "var(--danger)"
			: type === "success"
			? "var(--success)"
			: "var(--text-muted)";
}

/** 執行格式化並更新輸出 */
async function runFormat() {
	const raw = elInput.value;
	if (!raw.trim()) {
		elOutput.textContent = "";
		setStatus("");
		return;
	}

	const prefixLines = PrefixManager.getActivePrefixLines();
	const result = await window.electronAPI.formatQuery(raw, prefixLines);

	if (result.success) {
		elOutput.textContent = result.result;
		setStatus("格式化完成", "success");
		HistoryManager.push(raw);
	} else {
		elOutput.textContent = result.result;
		setStatus(`格式化失敗：${result.error || "未知錯誤"}`, "error");
	}
}

/** 初始化 */
async function init() {
	// Prefix Manager
	await PrefixManager.init();

	// 歷史記錄（點選歷史時載入到輸入框）
	HistoryManager.init((query) => {
		elInput.value = query;
		runFormat();
	});

	// Fuseki（傳入取得當前 output query 的函數）
	await FusekiManager.init(() => elOutput.textContent);

	// 格式化按鈕
	document.getElementById("btn-format").addEventListener("click", runFormat);

	// 輸入自動 debounce 格式化（500ms）
	elInput.addEventListener("input", () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(runFormat, 500);
	});

	// 清除
	document.getElementById("btn-clear").addEventListener("click", () => {
		elInput.value = "";
		elOutput.textContent = "";
		setStatus("");
	});

	// 複製結果
	document.getElementById("btn-copy").addEventListener("click", async () => {
		const text = elOutput.textContent;
		if (!text) return;
		await navigator.clipboard.writeText(text);
		setStatus("已複製到剪貼簿", "success");
		setTimeout(() => setStatus(""), 2000);
	});

	// 存檔
	document.getElementById("btn-save").addEventListener("click", async () => {
		const text = elOutput.textContent;
		if (!text) {
			setStatus("沒有可存的內容", "error");
			return;
		}
		const result = await window.electronAPI.saveFile(text);
		if (result.success) {
			setStatus(`已存至 ${result.filePath}`, "success");
		} else if (result.error) {
			setStatus(`存檔失敗：${result.error}`, "error");
		}
	});
}

init();
