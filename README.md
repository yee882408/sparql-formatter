# SPARQL Formatter

一個桌面應用程式，用來格式化 SPARQL query，讓查詢語法更易讀。

適合搭配 Apache Jena Fuseki 等三元組資料庫使用。

---

## 功能

- **即時格式化**：貼入 SPARQL query 後自動排版，500ms debounce
- **SPO 各自一行**：每個三元組以 `.` 為結尾並換行
- **Placeholder 獨立一行**：`[keyword]` 等佔位符自動獨立一行
- **Prefix 管理**：新增自訂 Prefix，支援多個 Preset 切換（適合多專案）
- **查詢歷史**：自動記錄最近 50 筆格式化過的 query，可點選回放
- **Fuseki 整合**：直接輸入 endpoint URL，格式化後一鍵對資料庫執行查詢
- **存檔導出**：將格式化結果存成 `.rq` 或 `.txt`
- **複製**：一鍵複製格式化結果到剪貼簿

---

## 安裝與使用

### 方法一：直接下載安裝檔（推薦）

1. 前往 [Releases](https://github.com/yee882408/sparql-formatter/releases) 下載最新的 `SPARQL Formatter Setup x.x.x.exe`
2. 執行安裝檔
3. 安裝完成後桌面與開始選單會出現 **SPARQL Formatter** 捷徑

### 方法二：從原始碼執行

**環境需求：**
- Node.js 14+
- npm

```bash
# 1. Clone 專案
git clone https://github.com/yee882408/sparql-formatter.git
cd sparql-formatter

# 2. 安裝依賴
npm install

# 3. 啟動
npm start
```

### 方法三：自行打包

```bash
npm run build
```

打包完成後安裝檔位於 `dist/SPARQL Formatter Setup x.x.x.exe`。

---

## 使用說明

### 格式化 Query

1. 在左側主輸入框貼入 SPARQL query
2. 右側會自動顯示格式化結果（或點擊「格式化」按鈕）
3. 點「複製結果」複製到剪貼簿，或點「存檔」存成 `.rq` 檔

### 管理 Prefix

1. 點左側欄「+」按鈕新增 Prefix
2. 填入名稱（例如 `ex:`）與 URI（例如 `<http://example.org/>`）
3. 勾選要套用的 Prefix，格式化時會自動插入 query 頂端
4. 點「+」（Preset 旁）可建立多個 Preset，方便切換不同專案的 Prefix 組合

### 連接 Fuseki

1. 在左側欄 Fuseki 區塊填入 endpoint URL，例如：
   ```
   http://localhost:3030/dataset/query
   ```
2. 格式化 query 後點「執行查詢」
3. 查詢結果會顯示於右側 Panel（JSON 格式）

### 查詢歷史

- 點底部「歷史記錄」按鈕開啟歷史 Panel
- 點選任一筆歷史可載入回輸入框

---

## 技術棧

| 項目 | 版本 |
|------|------|
| Electron | 41.x |
| sparqljs | 3.7.x |
| electron-store | 8.x |
| Node.js（開發） | 14+ |

---

## 專案結構

```
sparql-formatter/
├── main.js              # Electron main process（視窗管理、IPC）
├── preload.js           # contextBridge 安全橋接
├── formatter.js         # SPARQL 格式化核心（sparqljs + fallback tokenizer）
├── renderer/
│   ├── index.html       # 主介面
│   ├── style.css        # 深色主題樣式
│   ├── app.js           # 主入口
│   ├── prefix-manager.js  # Prefix / Preset 管理
│   ├── history.js       # 查詢歷史
│   └── fuseki.js        # Fuseki 整合
└── assets/
    └── icon.ico / icon.png
```

---

## License

ISC
