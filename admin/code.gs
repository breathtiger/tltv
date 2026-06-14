// ── 天良衛星電視台 後台 Apps Script ──────────────────────────────────────────
// 部署方式：
//   1. 前往 https://script.google.com 建立新專案，貼入此檔案
//   2. 執行 setupAdminPassword() 一次（設定管理員密碼）
//   3. 部署 → 新增部署作業 → 網頁應用程式
//      執行身分：「我」；存取權：「所有人」
//   4. 複製部署 URL → 貼入後台「設定」→ Apps Script URL

const CONTENT_SHEET_ID = '11Mp1nDCeDnTBQOUN9IZ6ign3XC1rEXyHLRIwDwZXTEg';

// ── 主進入點（接收後台 POST 請求）────────────────────────────────────────────
function doPost(e) {
  const result = { ok: false };
  try {
    const payload = JSON.parse(e.postData.contents);

    // 密碼儲存於 Script Properties（不寫死在程式碼）
    const props      = PropertiesService.getScriptProperties();
    const correctPwd = props.getProperty('ADMIN_PASSWORD');
    if (!correctPwd || payload.password !== correctPwd) {
      result.error = '密碼驗證失敗';
      return jsonOut(result);
    }

    const ss             = SpreadsheetApp.openById(CONTENT_SHEET_ID);
    const { action, data } = payload;

    // ── 輪播文案：全量更新 A2:C5 ──────────────────────────────────────────────
    if (action === 'update_carousel') {
      const sh = ss.getSheetByName('carousel');
      sh.getRange('A2:C5').clearContent();
      (data.rows || []).slice(0, 4).forEach((row, i) => {
        sh.getRange(i + 2, 1, 1, 3).setValues([
          [String(row.A || ''), String(row.B || ''), String(row.C || '')]
        ]);
      });

    // ── 最新消息：新增一列 ─────────────────────────────────────────────────────
    } else if (action === 'add_news') {
      const sh = ss.getSheetByName('news');
      sh.appendRow([
        String(data.A || ''),
        String(data.B || ''),
        String(data.C || ''),
        String(data.D || ''),
      ]);

    // ── 最新消息：更新指定列 ───────────────────────────────────────────────────
    } else if (action === 'update_news') {
      const sh  = ss.getSheetByName('news');
      const row = parseInt(data.rowIndex);
      if (!row || row < 2) throw new Error('rowIndex 無效');
      sh.getRange(row, 1, 1, 4).setValues([
        [String(data.A || ''), String(data.B || ''), String(data.C || ''), String(data.D || '')]
      ]);

    // ── 最新消息：刪除指定列 ───────────────────────────────────────────────────
    } else if (action === 'delete_news') {
      const sh  = ss.getSheetByName('news');
      const row = parseInt(data.rowIndex);
      if (!row || row < 2) throw new Error('rowIndex 無效');
      sh.deleteRow(row);

    // ── 跑馬燈：全量覆寫 ──────────────────────────────────────────────────────
    } else if (action === 'update_marquee') {
      const sh      = ss.getSheetByName('marquee');
      const lastRow = sh.getLastRow();
      if (lastRow > 0) sh.getRange(1, 1, lastRow, 1).clearContent();
      const items = (data.items || []).filter(Boolean);
      if (items.length) {
        sh.getRange(1, 1, items.length, 1).setValues(items.map(v => [String(v)]));
      }

    } else {
      result.error = '未知操作：' + action;
      return jsonOut(result);
    }

    result.ok = true;
  } catch (err) {
    result.error = err.message;
  }
  return jsonOut(result);
}

// ── 輔助：JSON 回應 ───────────────────────────────────────────────────────────
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 初始設定：第一次部署後執行一次 ───────────────────────────────────────────
// 在 Apps Script 編輯器中點「執行」→ 選此函式
function setupAdminPassword() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', 'Tltv@2026');
  Logger.log('✅ 管理員密碼設定完成（儲存於 Script Properties）');
}

// ── 測試用：確認密碼是否正確設定 ─────────────────────────────────────────────
function checkSetup() {
  const pwd = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log(pwd ? '✅ 密碼已設定' : '❌ 密碼未設定，請先執行 setupAdminPassword()');
  const ss = SpreadsheetApp.openById(CONTENT_SHEET_ID);
  Logger.log('試算表名稱：' + ss.getName());
}
