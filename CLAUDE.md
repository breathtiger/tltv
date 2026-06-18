# CLAUDE.md — 天良衛星電視台 (tltv)

## 專案概述
天良衛星電視台官方一頁式網站。純靜態部署於 GitHub Pages，
資料來源為 Google Sheets（公開發布），圖片存於 Google Drive（公開分享）。

## 安全性（公司強制規範）

> ⚠️ 以下資訊**絕不可** commit 至 Git

- Google Sheets Spreadsheet ID
- Google Drive File ID（個別圖片）
- 任何 API Key、Token、Secret

`config.js` 存放上述設定值。由於此站為 GitHub Pages 純靜態部署，
試算表和 Drive 資源均為公開，Spreadsheet ID 本身無私密性。
commit 前確認 config.js 僅含佔位符（`YOUR_...`）或已確認為公開資源的 ID。

## 技術架構

| 層 | 技術 | 說明 |
|----|------|------|
| 前端 | HTML / Bootstrap 5.3.3 / Vanilla JS | 無框架，純靜態 |
| 資料 | Google Sheets（gviz JSON API） | 無需 API Key，試算表需發布到網路 |
| 圖片 | Google Drive（thumbnail URL） | 需分享為「知道連結的人」 |
| 主機 | GitHub Pages | 零成本 |

## Google Sheets 欄位規格

**工作表：公告**
`date` | `title` | `content` | `image_id` | `link` | `active`

**工作表：頻道清單**
`county` | `operator` | `channel_no` | `notes`

**工作表：節目主持人（hosts）**
`order` | `name` | `photo_id` | `program` | `active`

**工作表：節目時段表（schedule）**
`time_slot` | `weekday_prog` | `weekday_type` | `weekend_prog` | `weekend_type`

- `active` 欄位：值為 `FALSE` 時隱藏，其餘（含空白）皆顯示
- `image_id` / `photo_id`：填入 Google Drive 檔案的 File ID（非完整 URL）
- `weekend_prog` 留空 → 週一至日合併為同一格（colspan=7），適合全週重播時段
- `weekend_prog` 有值且與 `weekday_prog` 不同 → 週六日欄位紫色強調

## 檔案結構

```
tltv/
├── index.html           ← 一頁式主頁
├── assets/
│   ├── css/style.css    ← 自訂樣式（主色：#0a1628、#d4a017）
│   ├── js/
│   │   ├── config.js    ← 設定值（填入實際 ID 後可 commit，見安全性說明）
│   │   ├── sheets.js    ← Sheets gviz 讀取工具
│   │   └── main.js      ← 四大區塊渲染邏輯
│   └── img/
│       └── banner-default.svg  ← Banner 佔位圖
├── .gitignore
└── CLAUDE.md
```

## 部署步驟（GitHub Pages）

1. `git init` → `git add .` → `git commit`
2. Push 至 GitHub
3. Settings → Pages → Branch: main / root

## 修改規則

- 只修改 `tltv/` 內的檔案
- 新增功能前需確認不引入 npm/Node.js（維持純靜態）
- 所有使用者可見字串需使用 `escHtml()` 處理
- 重大架構變更需回報總工程師
