/**
 * 查詢歷史管理
 * 存在 localStorage，上限 50 筆，去重
 */

const HistoryManager = (() => {
	const KEY = "sparql_history";
	const MAX = 50;

	let onLoadCallback = null;
	let elPanel, elList;

	function getAll() {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || [];
		} catch {
			return [];
		}
	}

	function save(items) {
		localStorage.setItem(KEY, JSON.stringify(items));
	}

	/** 新增一筆（去重，新的放最前面） */
	function push(query) {
		const trimmed = query.trim();
		if (!trimmed) return;
		let items = getAll().filter((q) => q !== trimmed);
		items.unshift(trimmed);
		if (items.length > MAX) items = items.slice(0, MAX);
		save(items);
	}

	function render() {
		const items = getAll();
		elList.innerHTML = "";
		if (items.length === 0) {
			const li = document.createElement("li");
			li.className = "history-item";
			li.style.color = "var(--text-muted)";
			li.textContent = "（尚無歷史記錄）";
			elList.appendChild(li);
			return;
		}
		items.forEach((q) => {
			const li = document.createElement("li");
			li.className = "history-item";
			li.title = q;
			li.textContent = q.replace(/\s+/g, " ").substring(0, 120);
			li.addEventListener("click", () => {
				if (onLoadCallback) onLoadCallback(q);
				hide();
			});
			elList.appendChild(li);
		});
	}

	function show() {
		render();
		elPanel.classList.remove("hidden");
	}

	function hide() {
		elPanel.classList.add("hidden");
	}

	function init(onLoad) {
		onLoadCallback = onLoad;
		elPanel = document.getElementById("history-panel");
		elList = document.getElementById("history-list");

		document.getElementById("btn-history").addEventListener("click", () => {
			if (elPanel.classList.contains("hidden")) show();
			else hide();
		});
		document.getElementById("btn-close-history").addEventListener("click", hide);
	}

	return { init, push };
})();
