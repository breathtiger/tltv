# communicate.md — 天良衛星電視台 (tltv) 交接紀錄

---

## 紀錄 #2 — 2026-06-18

### 本次完成事項

| # | 項目 | 相關檔案 |
|---|------|---------|
| 1 | 首頁加入「節目時段表」區塊（最新消息與頻道查詢之間） | `index.html`、`assets/css/style.css` |
| 2 | 節目時段表改為動態讀取（Google Sheets `schedule` 工作表） | `assets/js/main.js`、`assets/js/config.js` |
| 3 | 後台新增「時段表」Tab — 支援新增 / 編輯 / 刪除 / 排序 | `admin/index.html`、`admin/assets/js/admin.js` |
| 4 | Apps Script 加入 `update_all_schedule` 全量覆寫動作 | `admin/code.gs` |
| 5 | `CLAUDE.md` 補充 hosts / schedule 工作表欄位規格 | `CLAUDE.md` |

### 技術細節

#### 節目時段表架構

**Sheets 工作表名稱：** `schedule`（位於 `CONTENT_SHEET_ID` 試算表）

**欄位：**
```
A: time_slot      時段（例：06:00 – 08:00）
B: weekday_prog   週一~五 節目名稱
C: weekday_type   週一~五 分類（例：普級/新播）
D: weekend_prog   週六日 節目名稱（留空 → 合併為全週同一格）
E: weekend_type   週六日 分類（留空 → 同 weekday_type）
```

**前台渲染規則：**
- `weekend_prog` 為空 → `colspan=7`（全週合併，如每日精選重播）
- `weekend_prog` 有值且與 `weekday_prog` 不同 → 週六日欄紫色強調（鑽石大舞台特別版）
- Sheet 尚未建立或為空 → 顯示 `SCHEDULE_FALLBACK`（12 時段備用資料）

**後台操作：**
1. 登入後台 → 切換「時段表」Tab
2. 可新增 / 編輯 / 刪除各時段列
3. 以 ▲▼ 調整順序後點「儲存排列順序」
4. 儲存後約 10–30 秒前台生效

**Apps Script 動作（code.gs）：**
- `update_all_schedule` — 全量覆寫 schedule 工作表（A2:E），首次呼叫自動建立工作表

### 注意事項

| 項目 | 說明 |
|------|------|
| schedule 工作表 | 首次從後台儲存時 Apps Script 自動建立（含標題列）；不需手動建立 |
| 備用資料 | `main.js` 內的 `SCHEDULE_FALLBACK` 含完整 12 個時段，可隨時作為參考 |
| 前次未推送 commits | 本次一併推上（共 9 commits）：含圖片上傳、SEO 後台、首頁更新等 |

---

## 紀錄 #1 — 2026-06-14

### 本次完成事項

| # | 項目 | 相關檔案 |
|---|------|---------|
| 1 | 修正 Banner 輪播文字載入順序錯誤 | `assets/js/main.js` |
| 2 | 修正最新消息讀取失敗（標題列被當資料） | `assets/js/main.js` |
| 3 | `<head>` SEO 結構化：favicon、keywords、OG、Twitter Card | `index.html` |
| 4 | 頁尾加入 Facebook / YouTube 社群連結 | `index.html`、`assets/css/style.css` |
| 5 | 建立後台管理系統（登入 + 四大管理功能） | `admin/` 全部新增 |

---

### 技術細節

#### Bug Fix — gviz 不識別標題列

**根因：** `CONTENT_SHEET_ID` 試算表的三個工作表（`carousel`、`news`、`marquee`）gviz API 回傳的欄標籤均為空，導致第一列（標題列）被視為資料，造成：
- `carousel`：`caption-0` 顯示「標題」/「短說明」字面文字；`banner_4` 文字錯位
- `news`：只回傳一列（即標題列），無實際資料

**修正方式（`main.js`）：**
```javascript
// carousel：加 range: 'A2:C' 跳過標題，以 r['A'] 數字決定對應 caption index
fetchSheetData(CONFIG.CONTENT_SHEETS.CAROUSEL, { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:C' })
// news：加 range: 'A2:D' 跳過標題，用 r['B'] 篩選有標題的列
fetchSheetData(CONFIG.CONTENT_SHEETS.NEWS, { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:D' })
```

#### 後台架構

```
admin/
├── index.html            ← 登入頁 + 後台 SPA（Bootstrap 5）
├── code.gs               ← Google Apps Script（需自行部署，不含金鑰）
└── assets/
    ├── css/admin.css     ← 後台樣式
    └── js/admin.js       ← 登入驗證、CRUD 邏輯、Apps Script 通訊
```

**登入驗證：**
- 帳號：`admin`
- 密碼：`Tltv@2026`（前台以 SHA-256 雜湊比對，不儲存明文）
- Session 存於 `sessionStorage`，關閉分頁自動清除

**後台功能：**
- 輪播文案：編輯 `carousel` 工作表 A2:C5（全量覆寫）
- 最新消息：新增 / 編輯 / 刪除 `news` 工作表各列
- 跑馬燈：全量覆寫 `marquee` 工作表 A 欄
- 設定：填入 Apps Script Web App URL（存 `localStorage`，不 commit）

---

### 已知事項與注意點

| 項目 | 說明 |
|------|------|
| Apps Script URL | 業主已取得並設定於後台「設定」頁籤；URL 依規範**不 commit 至 Git** |
| Apps Script 密碼 | 需在 Apps Script 編輯器執行 `setupAdminPassword()` 一次，寫入 Script Properties |
| CORS | Apps Script Web App 以 `Content-Type: text/plain` POST 避免 preflight，回應為 JSON |
| gviz 快取 | Sheets 資料更新後前台約需 10–30 秒才反映，後台需手動點「重新讀取」 |
| `news` 工作表 | 目前尚無真實資料，前台顯示 `SAMPLE_NEWS` 備用三篇 |
| `og:url` / `og:image` | `index.html` 內含 `YOUR_DOMAIN` 佔位符，部署至正式網域後請更換 |
| SHA-256 密碼 | `admin/js/admin.js` 內的 `ADMIN_HASH` 為 `Tltv@2026` 的雜湊值，未來若需換密碼，同步更新 Apps Script Properties 與此常數 |

---

### 檔案結構（完整）

```
tltv/
├── index.html                      ← 一頁式前台（含 SEO meta、OG、社群連結）
├── .gitignore
├── CLAUDE.md                       ← 專案規範
├── communicate.md                  ← 本交接文件
├── admin/
│   ├── index.html                  ← 後台管理 SPA
│   ├── code.gs                     ← Apps Script（部署用，不含金鑰）
│   └── assets/
│       ├── css/admin.css
│       └── js/admin.js
└── assets/
    ├── css/style.css               ← 企業色 #0a1628 / #d4a017 / #0aa08c
    ├── js/
    │   ├── config.js               ← 兩個 Spreadsheet ID（公開資源，可 commit）
    │   ├── sheets.js               ← gviz 工具（fetchSheetData / escHtml / driveImgUrl）
    │   └── main.js                 ← 四大區塊渲染邏輯 + 20 位主持人資料
    └── img/
        ├── logo.png
        ├── carousel/banner_1–4.png
        └── host/（20 張主持人照片）
```

---

### Google Sheets 設定（兩個試算表）

| 用途 | Spreadsheet ID | 工作表 |
|------|---------------|--------|
| 頻道清單 | `15UM-RcLVH0y9GgE11AbmbWKRVm_yjLNcSJtnHqrKL2k` | `頻道清單`（第 1 列為合併標題，資料從第 2 列起） |
| 網站內容 | `11Mp1nDCeDnTBQOUN9IZ6ign3XC1rEXyHLRIwDwZXTEg` | `carousel`、`news`、`marquee` |

> 兩個試算表均已「發布到網路」，gviz 可直接讀取，無需 API Key。

---

### 未完成事項

- [ ] `og:url` / `og:image` 替換 `YOUR_DOMAIN` 為正式網址（部署後）
- [ ] `news` 工作表填入真實公告（後台已可操作）
- [ ] 確認 Apps Script 已執行 `setupAdminPassword()`（業主側操作）
- [ ] GitHub Pages 部署（`git init` → `git add .` → `git commit` → push → 開啟 Pages）
- [ ] 後台密碼未來若需更換：同步修改 `admin.js` 的 `ADMIN_HASH` 常數與 Apps Script Properties

---

### 下一步建議

1. **推上 GitHub Pages**：執行 `git init`、`git add .`、`git commit`，push 後至 Settings → Pages 啟用
2. **填入正式網址後**：更新 `index.html` 的 OG 標籤（搜尋 `YOUR_DOMAIN` 共 3 處）
3. **後台未來擴充方向**：Banner 圖片上傳（目前仍需手動傳至 Google Drive）、頻道清單後台編輯

---

*交接人：Claude Sonnet 4.6 / 日期：2026-06-14*
