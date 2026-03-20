/**
 * Fuseki 整合
 * 對指定 SPARQL endpoint 送出 query，顯示結果
 */

const FusekiManager = (() => {
	const ENDPOINT_KEY = "fusekiEndpoint";

	let elEndpoint, elStatus, elPanel, elResult;
	let getQueryCallback = null;

	async function init(getQuery) {
		getQueryCallback = getQuery;
		elEndpoint = document.getElementById("fuseki-endpoint");
		elStatus = document.getElementById("fuseki-status");
		elPanel = document.getElementById("fuseki-panel");
		elResult = document.getElementById("fuseki-result");

		// 載入已儲存的 endpoint
		const saved = await window.electronAPI.storeGet(ENDPOINT_KEY);
		if (saved) elEndpoint.value = saved;

		// 儲存 endpoint 變更
		elEndpoint.addEventListener("change", () => {
			window.electronAPI.storeSet(ENDPOINT_KEY, elEndpoint.value.trim());
		});

		document.getElementById("btn-run-fuseki").addEventListener("click", run);
		document.getElementById("btn-close-fuseki").addEventListener("click", () => {
			elPanel.classList.add("hidden");
		});
	}

	async function run() {
		const endpoint = elEndpoint.value.trim();
		if (!endpoint) {
			elStatus.textContent = "請先填入 Fuseki endpoint URL";
			return;
		}
		const query = getQueryCallback ? getQueryCallback() : "";
		if (!query.trim()) {
			elStatus.textContent = "請先輸入 SPARQL query";
			return;
		}

		elStatus.textContent = "執行中...";
		elResult.textContent = "";
		elPanel.classList.remove("hidden");

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/sparql-query",
					"Accept": "application/sparql-results+json",
				},
				body: query,
			});

			if (!response.ok) {
				const text = await response.text();
				elStatus.textContent = `HTTP ${response.status}`;
				elResult.textContent = text;
				return;
			}

			const json = await response.json();
			elResult.textContent = JSON.stringify(json, null, 2);
			elStatus.textContent = `完成，${json.results?.bindings?.length ?? 0} 筆結果`;
		} catch (err) {
			elStatus.textContent = "連線失敗";
			elResult.textContent = err.message;
		}
	}

	return { init };
})();
