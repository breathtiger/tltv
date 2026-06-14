/**
 * sheets.js — Google Sheets gviz JSON 讀取工具
 *
 * 試算表必須已「發布到網路」(公開) 才能讀取。
 *
 * @param {string} sheetName 工作表名稱
 * @param {object} opts
 *   opts.sheetId  - 指定不同試算表 ID（預設用 CONFIG.SHEET_ID）
 *   opts.range    - 指定讀取範圍，例如 "A2:Z"（用來跳過標題列）
 *   opts.noHeader - true 時以 headers=0 模式讀取（全部列視為資料，不含欄名）
 */
async function fetchSheetData(sheetName, { sheetId, range, noHeader } = {}) {
  const spreadsheetId = sheetId || CONFIG.SHEET_ID;

  let url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}` +
    `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  if (range)    url += `&range=${encodeURIComponent(range)}`;
  if (noHeader) url += '&headers=0';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Sheets 回應格式異常，請確認試算表已發布到網路');

  const data = JSON.parse(match[1]);
  if (data.status === 'error') {
    throw new Error(data.errors?.[0]?.message || 'Sheets 讀取失敗');
  }

  return tableToRows(data.table);
}

function tableToRows(table) {
  const headers = table.cols.map(c => (c.label || c.id || '').trim());
  return table.rows
    .filter(row => row.c?.some(cell => cell?.v != null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const cell = row.c?.[i];
        obj[h] = cell ? cell.v : null;
      });
      return obj;
    });
}

function driveImgUrl(fileId, size = 400) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
