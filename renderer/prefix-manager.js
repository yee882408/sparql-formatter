/**
 * Prefix Manager
 * 管理多個 Preset，每個 Preset 包含一組 Prefix
 * 資料結構：
 *   presets: Array<{ name: string, prefixes: Array<{ name: string, uri: string, enabled: boolean }> }>
 *   activePreset: number (index)
 */

const PrefixManager = (() => {
	const STORE_KEY = "prefixPresets";
	const ACTIVE_KEY = "activePreset";

	let presets = [];
	let activeIndex = 0;

	// DOM refs（初始化後賦值）
	let elSelect, elList, elPresetDialog, elPrefixDialog;
	let elNewPresetName, elNewPrefixName, elNewPrefixUri;

	async function load() {
		presets = (await window.electronAPI.storeGet(STORE_KEY)) || [
			{ name: "預設", prefixes: [] },
		];
		activeIndex = (await window.electronAPI.storeGet(ACTIVE_KEY)) || 0;
		if (activeIndex >= presets.length) activeIndex = 0;
	}

	async function save() {
		await window.electronAPI.storeSet(STORE_KEY, presets);
		await window.electronAPI.storeSet(ACTIVE_KEY, activeIndex);
	}

	function currentPreset() {
		return presets[activeIndex] || presets[0];
	}

	/** 取得目前 preset 中已勾選的 PREFIX 行 */
	function getActivePrefixLines() {
		const preset = currentPreset();
		if (!preset) return [];
		return preset.prefixes
			.filter((p) => p.enabled)
			.map((p) => `PREFIX ${p.name} ${p.uri}`);
	}

	function renderPresetSelect() {
		elSelect.innerHTML = "";
		presets.forEach((p, i) => {
			const opt = document.createElement("option");
			opt.value = i;
			opt.textContent = p.name;
			if (i === activeIndex) opt.selected = true;
			elSelect.appendChild(opt);
		});
	}

	function renderPrefixList() {
		const preset = currentPreset();
		elList.innerHTML = "";
		if (!preset) return;
		preset.prefixes.forEach((p, i) => {
			const li = document.createElement("li");
			li.className = "prefix-item";

			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = p.enabled;
			cb.addEventListener("change", () => {
				preset.prefixes[i].enabled = cb.checked;
				save();
			});

			const span = document.createElement("span");
			span.className = "prefix-text";
			span.title = `${p.name} ${p.uri}`;
			span.textContent = `${p.name} ${p.uri}`;

			const btnRemove = document.createElement("button");
			btnRemove.className = "btn-remove";
			btnRemove.textContent = "✕";
			btnRemove.title = "刪除";
			btnRemove.addEventListener("click", () => {
				preset.prefixes.splice(i, 1);
				save();
				renderPrefixList();
			});

			li.appendChild(cb);
			li.appendChild(span);
			li.appendChild(btnRemove);
			elList.appendChild(li);
		});
	}

	function render() {
		renderPresetSelect();
		renderPrefixList();
	}

	async function init() {
		elSelect = document.getElementById("preset-select");
		elList = document.getElementById("prefix-list");
		elPresetDialog = document.getElementById("preset-dialog");
		elPrefixDialog = document.getElementById("prefix-dialog");
		elNewPresetName = document.getElementById("new-preset-name");
		elNewPrefixName = document.getElementById("new-prefix-name");
		elNewPrefixUri = document.getElementById("new-prefix-uri");

		await load();
		render();

		// 切換 preset
		elSelect.addEventListener("change", () => {
			activeIndex = parseInt(elSelect.value, 10);
			save();
			renderPrefixList();
		});

		// 新增 Preset
		document.getElementById("btn-add-preset").addEventListener("click", () => {
			elNewPresetName.value = "";
			elPresetDialog.classList.remove("hidden");
			elNewPresetName.focus();
		});
		document.getElementById("btn-preset-confirm").addEventListener("click", addPreset);
		document.getElementById("btn-preset-cancel").addEventListener("click", () => {
			elPresetDialog.classList.add("hidden");
		});
		elNewPresetName.addEventListener("keydown", (e) => {
			if (e.key === "Enter") addPreset();
			if (e.key === "Escape") elPresetDialog.classList.add("hidden");
		});

		// 刪除 Preset
		document.getElementById("btn-del-preset").addEventListener("click", () => {
			if (presets.length <= 1) return;
			presets.splice(activeIndex, 1);
			activeIndex = Math.max(0, activeIndex - 1);
			save();
			render();
		});

		// 新增 Prefix
		document.getElementById("btn-add-prefix").addEventListener("click", () => {
			elNewPrefixName.value = "";
			elNewPrefixUri.value = "";
			elPrefixDialog.classList.remove("hidden");
			elNewPrefixName.focus();
		});
		document.getElementById("btn-prefix-confirm").addEventListener("click", addPrefix);
		document.getElementById("btn-prefix-cancel").addEventListener("click", () => {
			elPrefixDialog.classList.add("hidden");
		});
		elNewPrefixUri.addEventListener("keydown", (e) => {
			if (e.key === "Enter") addPrefix();
			if (e.key === "Escape") elPrefixDialog.classList.add("hidden");
		});
	}

	async function addPreset() {
		const name = elNewPresetName.value.trim();
		if (!name) return;
		presets.push({ name, prefixes: [] });
		activeIndex = presets.length - 1;
		await save();
		render();
		elPresetDialog.classList.add("hidden");
	}

	async function addPrefix() {
		let name = elNewPrefixName.value.trim();
		let uri = elNewPrefixUri.value.trim();
		if (!name || !uri) return;
		// 自動補齊冒號
		if (!name.endsWith(":")) name += ":";
		// 自動補齊 <>
		if (!uri.startsWith("<")) uri = "<" + uri;
		if (!uri.endsWith(">")) uri = uri + ">";

		const preset = currentPreset();
		preset.prefixes.push({ name, uri, enabled: true });
		await save();
		renderPrefixList();
		elPrefixDialog.classList.add("hidden");
	}

	return { init, getActivePrefixLines };
})();
