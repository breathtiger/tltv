// ── 天良衛星電視台 後台 Apps Script ──────────────────────────────────────────
// 部署方式：
//   1. 前往 https://script.google.com 建立新專案，貼入此檔案
//   2. 執行 setupAdminPassword() 一次（設定管理員密碼）
//   3. 部署 → 新增部署作業 → 網頁應用程式
//      執行身分：「我」；存取權：「所有人」
//   4. 複製部署 URL → 貼入後台「設定」→ Apps Script URL
//   ※ 更新程式碼後需重新部署（新增部署版本），URL 會改變

const CONTENT_SHEET_ID = 'YOUR_CONTENT_SHEET_ID';   // 請填入實際 Spreadsheet ID

// ── 主進入點 ─────────────────────────────────────────────────────────────────
function doPost(e) {
  const result = { status: 'error', message: '' };
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action } = payload;
    const ss = SpreadsheetApp.openById(CONTENT_SHEET_ID);

    // ── 輪播文案：全量更新 A2:D5（含圖片 ID）────────────────────────────────
    if (action === 'update_carousel') {
      const sh = ss.getSheetByName('carousel');
      sh.getRange('A2:D5').clearContent();
      (payload.rows || []).slice(0, 4).forEach((row, i) => {
        sh.getRange(i + 2, 1, 1, 4).setValues([[
          String(row[0] || ''),
          String(row[1] || ''),
          String(row[2] || ''),
          String(row[3] || ''),
        ]]);
      });

    // ── 最新消息：新增（含封面圖 ID）─────────────────────────────────────────
    } else if (action === 'add_news') {
      const sh = ss.getSheetByName('news');
      sh.appendRow([
        String(payload.date    || ''),
        String(payload.title   || ''),
        String(payload.summary || ''),
        String(payload.content || ''),
        String(payload.image_id || ''),
      ]);

    // ── 最新消息：更新指定列 ─────────────────────────────────────────────────
    } else if (action === 'update_news') {
      const sh  = ss.getSheetByName('news');
      const row = parseInt(payload.row);
      if (!row || row < 2) throw new Error('row 無效');
      sh.getRange(row, 1, 1, 5).setValues([[
        String(payload.date    || ''),
        String(payload.title   || ''),
        String(payload.summary || ''),
        String(payload.content || ''),
        String(payload.image_id || ''),
      ]]);

    // ── 最新消息：刪除指定列 ─────────────────────────────────────────────────
    } else if (action === 'delete_news') {
      const sh  = ss.getSheetByName('news');
      const row = parseInt(payload.row);
      if (!row || row < 2) throw new Error('row 無效');
      sh.deleteRow(row);

    // ── 跑馬燈：全量覆寫（無標題列，從 row 1 寫入）────────────────────────────
    } else if (action === 'update_marquee') {
      const sh      = ss.getSheetByName('marquee');
      const lastRow = sh.getLastRow();
      if (lastRow > 0) sh.getRange(1, 1, lastRow, 1).clearContent();
      const lines = (payload.lines || []).filter(Boolean);
      if (lines.length) {
        sh.getRange(1, 1, lines.length, 1).setValues(lines.map(v => [String(v)]));
      }

    // ── 主持人：新增一列 ─────────────────────────────────────────────────────
    } else if (action === 'add_host') {
      const sh = getOrCreateHostSheet(ss);
      sh.appendRow([
        parseInt(payload.order) || (sh.getLastRow()),
        String(payload.name     || ''),
        String(payload.photo_id || ''),
        String(payload.program  || ''),
        String(payload.active   || 'TRUE'),
      ]);

    // ── 主持人：全量覆寫（排序 / 編輯 / 刪除後呼叫）────────────────────────
    } else if (action === 'update_all_hosts') {
      const sh = getOrCreateHostSheet(ss);
      const lastRow = sh.getLastRow();
      if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, 5).clearContent();
      const hosts = (payload.hosts || []).filter(h => h.name);
      if (hosts.length) {
        sh.getRange(2, 1, hosts.length, 5).setValues(
          hosts.map((h, i) => [
            i + 1,
            String(h.name     || ''),
            String(h.photo_id || ''),
            String(h.program  || ''),
            String(h.active   || 'TRUE'),
          ])
        );
      }

    // ── SEO 設定：更新 seo 工作表第 2 列 ────────────────────────────────────
    } else if (action === 'update_seo') {
      let sh = ss.getSheetByName('seo');
      if (!sh) {
        sh = ss.insertSheet('seo');
        sh.getRange('A1:C1').setValues([['title', 'description', 'keywords']]);
        sh.setFrozenRows(1);
      }
      sh.getRange('A2:C2').setValues([[
        String(payload.title       || ''),
        String(payload.description || ''),
        String(payload.keywords    || ''),
      ]]);

    // ── 圖片上傳：base64 → Google Drive ─────────────────────────────────────
    } else if (action === 'upload_image') {
      const folderId = String(payload.folderId || '');
      if (!folderId) throw new Error('未提供 Drive 資料夾 ID');
      const folder = DriveApp.getFolderById(folderId);
      const bytes  = Utilities.base64Decode(payload.base64);
      const blob   = Utilities.newBlob(bytes, String(payload.mimeType || 'image/jpeg'), String(payload.filename || 'image.jpg'));
      const file   = folder.createFile(blob);
      const fileId = file.getId();   // 先取得 ID，不受 setSharing 影響
      try {
        // 共用雲端硬碟可能不支援此操作，忽略錯誤
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (_) {}
      result.status = 'ok';
      result.fileId = fileId;
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);

    } else {
      throw new Error('未知操作：' + action);
    }

    result.status = 'ok';
  } catch (err) {
    result.message = err.message;
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 取得或建立 hosts 工作表 ──────────────────────────────────────────────────
function getOrCreateHostSheet(ss) {
  let sh = ss.getSheetByName('hosts');
  if (!sh) {
    sh = ss.insertSheet('hosts');
    sh.getRange('A1:E1').setValues([['order', 'name', 'photo_id', 'program', 'active']]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ── 初始設定：第一次部署後執行一次 ──────────────────────────────────────────
function setupAdminPassword() {
  // 密碼不寫死在程式碼，改存於 Script Properties
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', 'Tltv@2026');
  Logger.log('✅ 管理員密碼設定完成');
}

// ── 確認設定是否正確 ─────────────────────────────────────────────────────────
function checkSetup() {
  const ss  = SpreadsheetApp.openById(CONTENT_SHEET_ID);
  Logger.log('試算表：' + ss.getName());
  const sheets = ss.getSheets().map(s => s.getName()).join(', ');
  Logger.log('工作表：' + sheets);
}
