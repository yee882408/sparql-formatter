const { Parser, Generator } = require("sparqljs");

/**
 * 使用 sparqljs 解析並重新序列化 SPARQL query
 * 若解析失敗則 fallback 至 tokenizer 模式
 *
 * @param {string} query - 原始 SPARQL query 字串
 * @param {string[]} prefixLines - 要插入頂端的 PREFIX 行（例如 ["PREFIX foo: <...>"]）
 * @returns {{ success: boolean, result: string, error?: string }}
 */
function formatQuery(query, prefixLines = []) {
	// 先嘗試 sparqljs 解析
	try {
		const parser = new Parser();
		const generator = new Generator();
		const parsed = parser.parse(query);
		const formatted = generator.stringify(parsed);
		const output = buildOutput(formatted, prefixLines);
		return { success: true, result: output };
	} catch (_) {
		// fallback：用 tokenizer 排版
		try {
			const formatted = tokenFormat(query);
			const output = buildOutput(formatted, prefixLines);
			return { success: true, result: output };
		} catch (err) {
			return { success: false, result: query, error: err.message };
		}
	}
}

/**
 * 將 prefixLines 插入到 query 頂端（去除 query 本身已有的 PREFIX 行）
 */
function buildOutput(formatted, prefixLines) {
	if (!prefixLines || prefixLines.length === 0) return formatted;

	const withoutExisting = formatted
		.split("\n")
		.filter((line) => !line.trim().toUpperCase().startsWith("PREFIX"))
		.join("\n")
		.trimStart();

	const prefixBlock = prefixLines.join("\n");
	return prefixBlock + "\n" + withoutExisting;
}

/**
 * Fallback tokenizer 格式化
 *
 * 策略：
 * 1. 先將整個 query 拆成 token（字串、URI、括號、大括號、點、一般文字）
 * 2. 逐 token 重建，遇到 { } 調整縮排，遇到 . 換行，遇到 [placeholder] 獨立一行
 */
function tokenFormat(query) {
	// ── Step 1：tokenize ──────────────────────────────────────────────
	// token 類型：string | uri | lbrace | rbrace | lparen | rparen | dot | placeholder | word
	const tokens = tokenize(query);

	// ── Step 2：重建帶縮排的行 ─────────────────────────────────────────
	const lines = [];
	let indent = 0;
	let currentTokens = []; // 目前行累積的 tokens

	const flushLine = () => {
		const text = currentTokens.join(" ").trim();
		if (text) lines.push("  ".repeat(indent) + text);
		currentTokens = [];
	};

	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];

		if (tok.type === "lbrace") {
			flushLine();
			lines.push("  ".repeat(indent) + "{");
			indent++;
		} else if (tok.type === "rbrace") {
			flushLine();
			indent = Math.max(0, indent - 1);
			lines.push("  ".repeat(indent) + "}");
		} else if (tok.type === "dot") {
			// 句點 → 目前行加上點後換行
			currentTokens.push(".");
			flushLine();
		} else if (tok.type === "placeholder") {
			// [xxx] → 獨立一行
			flushLine();
			lines.push("  ".repeat(indent) + tok.value);
		} else if (tok.type === "keyword_break") {
			// SELECT / WHERE / GROUP BY / ORDER BY 等結構關鍵字：先換行再輸出
			flushLine();
			currentTokens.push(tok.value);
		} else {
			currentTokens.push(tok.value);
		}
	}
	flushLine();

	// ── Step 3：後處理 ────────────────────────────────────────────────
	const result = lines
		.map((line) => {
			// UNION 縮退一層，與外層 { 對齊
			if (line.trim() === "UNION") {
				const depth = line.length - line.trimStart().length;
				const unindent = Math.max(0, depth - 2);
				return " ".repeat(unindent) + "UNION";
			}

			// 修正括號多餘空格：「( x」→「(x」、「x )」→「x)」、「BIND (」→「BIND(」
			const leadingSpaces = line.length - line.trimStart().length;
			let content = line.trimStart();
			// 移除 ( 後多餘空白
			content = content.replace(/\(\s+/g, "(");
			// 移除 ) 前多餘空白
			content = content.replace(/\s+\)/g, ")");
			// 關鍵字與 ( 之間不留空白（BIND、FILTER、REGEX、COUNT、DESC、ASC 等）
			content = content.replace(/\b(BIND|FILTER|REGEX|COUNT|SUM|AVG|MIN|MAX|DESC|ASC|NOT EXISTS|EXISTS|COALESCE|IF|STR|LANG|DATATYPE|IRI|URI|BNODE|RAND|ABS|CEIL|FLOOR|ROUND|STRLEN|SUBSTR|UCASE|LCASE|ENCODE_FOR_URI|CONTAINS|STRSTARTS|STRENDS|STRBEFORE|STRAFTER|YEAR|MONTH|DAY|HOURS|MINUTES|SECONDS|TIMEZONE|TZ|NOW|UUID|STRUUID|MD5|SHA1|SHA256|SHA384|SHA512|ISIRI|ISURI|ISBLANK|ISLITERAL|ISNUMERIC|BOUND|SAMETERM|OPTIONAL)\s+\(/g, "$1(");
			return " ".repeat(leadingSpaces) + content;
		})
		.join("\n");

	return result;
}

/**
 * 將 query 字串拆成結構化 token 陣列
 */
function tokenize(query) {
	// 結構關鍵字（需換行的）
	const BREAK_KEYWORDS = new Set([
		"SELECT", "CONSTRUCT", "DESCRIBE", "ASK",
		"WHERE", "OPTIONAL", "FILTER", "UNION", "MINUS",
		"BIND",
		"GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
		"PREFIX", "BASE", "FROM",
	]);

	// 大寫關鍵字清單（用於 case normalization）
	// 注意：SPARQL `a` (rdf:type shorthand) 保持小寫，不列入
	const ALL_KEYWORDS = [
		"SELECT", "DISTINCT", "REDUCED", "CONSTRUCT", "DESCRIBE", "ASK",
		"WHERE", "OPTIONAL", "FILTER", "UNION", "MINUS", "GRAPH", "SERVICE",
		"BIND", "VALUES", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
		"PREFIX", "BASE", "FROM", "NAMED", "AS", "NOT", "EXISTS", "IN", "ASC", "DESC",
	];

	// 先正規化換行、多餘空白
	let q = query.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

	// 關鍵字大寫（整個字）— 在 tokenize 前先做，避免逐 token 時遺漏
	// GROUP BY / ORDER BY 需特殊處理
	q = q.replace(/\bgroup\s+by\b/gi, "GROUP BY");
	q = q.replace(/\border\s+by\b/gi, "ORDER BY");
	ALL_KEYWORDS.filter((k) => !k.includes(" ")).forEach((kw) => {
		q = q.replace(new RegExp(`\\b${kw}\\b`, "gi"), kw);
	});

	const tokens = [];
	let i = 0;

	while (i < q.length) {
		// 跳過空白
		if (q[i] === " " || q[i] === "\t") {
			i++;
			continue;
		}

		// 三引號字串（sparqljs 常見 '''...'''）
		if (q.startsWith("'''", i)) {
			let end = q.indexOf("'''", i + 3);
			if (end === -1) end = q.length - 3;
			const val = q.slice(i, end + 3);
			tokens.push({ type: "string", value: val });
			i = end + 3;
			continue;
		}

		// 雙引號字串
		if (q[i] === '"') {
			let j = i + 1;
			while (j < q.length && q[j] !== '"') {
				if (q[j] === "\\") j++;
				j++;
			}
			tokens.push({ type: "string", value: q.slice(i, j + 1) });
			i = j + 1;
			continue;
		}

		// 單引號字串
		if (q[i] === "'") {
			let j = i + 1;
			while (j < q.length && q[j] !== "'") {
				if (q[j] === "\\") j++;
				j++;
			}
			tokens.push({ type: "string", value: q.slice(i, j + 1) });
			i = j + 1;
			continue;
		}

		// URI <...>（排除 <=）
		if (q[i] === "<" && q[i + 1] !== "=") {
			const end = q.indexOf(">", i + 1);
			if (end !== -1) {
				tokens.push({ type: "uri", value: q.slice(i, end + 1) });
				i = end + 1;
				continue;
			}
		}

		// Placeholder [xxx]
		if (q[i] === "[") {
			const end = q.indexOf("]", i + 1);
			if (end !== -1) {
				tokens.push({ type: "placeholder", value: q.slice(i, end + 1) });
				i = end + 1;
				continue;
			}
		}

		// 大括號
		if (q[i] === "{") { tokens.push({ type: "lbrace", value: "{" }); i++; continue; }
		if (q[i] === "}") { tokens.push({ type: "rbrace", value: "}" }); i++; continue; }

		// 小括號（保留在同行，不換行）
		if (q[i] === "(") { tokens.push({ type: "lparen", value: "(" }); i++; continue; }
		if (q[i] === ")") { tokens.push({ type: "rparen", value: ")" }); i++; continue; }

		// 句點（SPO 結尾）
		// 只有後面不是數字（避免把小數點當句點）才當換行
		if (q[i] === "." && (i + 1 >= q.length || !/\d/.test(q[i + 1]))) {
			tokens.push({ type: "dot", value: "." });
			i++;
			continue;
		}

		// 一般 token（讀到空白或特殊符號為止）
		let j = i;
		while (j < q.length && !/[ \t{}\(\)\[\]"'<>]/.test(q[j])) {
			// 句點需要特殊判斷
			if (q[j] === "." && (j + 1 >= q.length || !/\d/.test(q[j + 1]))) break;
			j++;
		}
		if (j === i) { i++; continue; } // 跳過無法解析的字元

		const word = q.slice(i, j);
		// 判斷是否為需換行的關鍵字
		const upper = word.toUpperCase();

		// 先檢查 GROUP BY / ORDER BY（已在前處理，但可能拆開）
		if (BREAK_KEYWORDS.has(upper)) {
			tokens.push({ type: "keyword_break", value: upper });
		} else {
			tokens.push({ type: "word", value: word });
		}
		i = j;
	}

	// 合併連續的 GROUP / BY 成 GROUP BY（以防萬一）
	const merged = [];
	for (let k = 0; k < tokens.length; k++) {
		const cur = tokens[k];
		const next = tokens[k + 1];
		if (
			cur.type === "word" &&
			cur.value.toUpperCase() === "GROUP" &&
			next &&
			next.type === "word" &&
			next.value.toUpperCase() === "BY"
		) {
			merged.push({ type: "keyword_break", value: "GROUP BY" });
			k++;
		} else if (
			cur.type === "word" &&
			cur.value.toUpperCase() === "ORDER" &&
			next &&
			next.type === "word" &&
			next.value.toUpperCase() === "BY"
		) {
			merged.push({ type: "keyword_break", value: "ORDER BY" });
			k++;
		} else {
			merged.push(cur);
		}
	}

	return merged;
}

module.exports = { formatQuery };
