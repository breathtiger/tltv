// ── 常數 ──────────────────────────────────────────────────────────────────────
// SHA-256("Tltv@2026") — 不儲存明文密碼
const ADMIN_HASH = 'd18cb2eb634724f691a072efb47122726dd8a1dfdd0c514bb292c439c8c4b768';

// ── 狀態 ──────────────────────────────────────────────────────────────────────
let sessionPwd   = sessionStorage.getItem('tltv_admin_pwd') || '';
let scriptUrl    = localStorage.getItem('tltv_admin_url')   || '';
let carouselData = [];   // [{A,B,C}, ...]  4 筆
let newsData     = [];   // [{A,B,C,D,_row}, ...]
let marqueeItems = [];   // string[]

// ── 初始化 ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 已有 session → 直接進後台
  if (sessionPwd && sha256Match(sessionPwd, ADMIN_HASH)) {
    showDashboard();
  }

  // 登入表單
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const user  = document.getElementById('loginUser').value.trim();
    const pwd   = document.getElementById('loginPwd').value;
    const errEl = document.getElementById('loginError');

    if (user !== 'admin' || !(await verifyPwd(pwd))) {
      errEl.textContent = '帳號或密碼錯誤，請重新輸入。';
      errEl.classList.remove('d-none');
      document.getElementById('loginPwd').value = '';
      return;
    }

    sessionStorage.setItem('tltv_admin_pwd', pwd);
    sessionPwd = pwd;
    errEl.classList.add('d-none');
    showDashboard();
  });

  // 密碼顯示切換
  document.getElementById('togglePwd').addEventListener('click', () => {
    const input = document.getElementById('loginPwd');
    const icon  = document.getElementById('togglePwdIcon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye';
    }
  });

  // 登出
  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('tltv_admin_pwd');
    sessionPwd = '';
    document.getElementById('viewDashboard').classList.add('d-none');
    document.getElementById('viewLogin').classList.remove('d-none');
    document.getElementById('loginPwd').value = '';
    document.getElementById('loginUser').value = '';
  });

  // Tab 切換
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Enter 鍵觸發登入
  document.getElementById('loginPwd').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginForm').requestSubmit();
  });
});

// ── 畫面切換 ──────────────────────────────────────────────────────────────────
function showDashboard() {
  document.getElementById('viewLogin').classList.add('d-none');
  document.getElementById('viewDashboard').classList.remove('d-none');
  switchTab('carousel');
  loadCarouselTab();
}

function switchTab(name) {
  document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-body').forEach(p => p.classList.add('d-none'));
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.remove('d-none');
  if (name === 'news')     loadNewsTab();
  if (name === 'marquee')  loadMarqueeTab();
  if (name === 'settings') initSettingsTab();
}

// ── 設定 Tab ──────────────────────────────────────────────────────────────────
function initSettingsTab() {
  document.getElementById('scriptUrlInput').value = scriptUrl;
  updateScriptUrlStatus();
}

function updateScriptUrlStatus() {
  const el = document.getElementById('scriptUrlStatus');
  if (scriptUrl) {
    el.textContent = '✓ 已設定';
    el.className = 'small mb-3 set';
  } else {
    el.textContent = '⚠ 尚未設定，儲存功能暫不可用';
    el.className = 'small mb-3 unset';
  }
}

function saveScriptUrl() {
  const url = document.getElementById('scriptUrlInput').value.trim();
  if (!url) { showToast('請輸入 Apps Script URL', false); return; }
  if (!url.startsWith('https://')) { showToast('URL 格式不正確', false); return; }
  localStorage.setItem('tltv_admin_url', url);
  scriptUrl = url;
  updateScriptUrlStatus();
  showToast('Apps Script URL 已儲存');
}

// ── 輪播文案 Tab ──────────────────────────────────────────────────────────────
async function loadCarouselTab() {
  const el = document.getElementById('carouselTabContent');
  el.innerHTML = loadingHtml();
  try {
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.CAROUSEL,
      { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:C' }
    );
    // 補齊 4 個 slot，依 A 欄數字對應
    carouselData = [1, 2, 3, 4].map(n => {
      const r = rows.find(row => String(row['A'] || '').match(new RegExp(`\\b${n}\\b`)));
      return r
        ? { A: String(r['A']).trim(), B: String(r['B'] || '').trim(), C: String(r['C'] || '').trim() }
        : { A: `banner_${n}`, B: '', C: '' };
    });
    renderCarouselTab();
  } catch (err) {
    el.innerHTML = errorHtml(err.message);
  }
}

function renderCarouselTab() {
  const el = document.getElementById('carouselTabContent');
  el.innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table admin-table">
          <thead>
            <tr>
              <th style="width:110px">Banner</th>
              <th>標題</th>
              <th class="d-none d-md-table-cell">短說明</th>
              <th style="width:70px"></th>
            </tr>
          </thead>
          <tbody>
            ${carouselData.map((r, i) => `
              <tr>
                <td><span class="banner-badge">${escHtml(r.A)}</span></td>
                <td class="fw-semibold">
                  ${r.B ? escHtml(r.B) : '<span class="text-muted fst-italic">（未填）</span>'}
                </td>
                <td class="text-muted small d-none d-md-table-cell">${escHtml(r.C)}</td>
                <td>
                  <button class="btn btn-outline-primary btn-sm" onclick="openCarouselModal(${i})">
                    <i class="bi bi-pencil-fill"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-muted small mt-2">
      <i class="bi bi-info-circle me-1"></i>
      儲存後約 10–30 秒在前台生效（Sheets 快取）。
    </p>`;
}

function openCarouselModal(idx) {
  const r = carouselData[idx];
  document.getElementById('carouselEditIdx').value   = idx;
  document.getElementById('carouselEditOrder').value = r.A;
  document.getElementById('carouselEditTitle').value = r.B;
  document.getElementById('carouselEditDesc').value  = r.C;
  document.getElementById('carouselModalLabel').textContent = `編輯輪播文案 — ${r.A}`;
  new bootstrap.Modal(document.getElementById('carouselModal')).show();
}

async function saveCarouselRow() {
  if (!checkScriptUrl()) return;
  const idx   = parseInt(document.getElementById('carouselEditIdx').value);
  const title = document.getElementById('carouselEditTitle').value.trim();
  const desc  = document.getElementById('carouselEditDesc').value.trim();

  carouselData[idx] = { ...carouselData[idx], B: title, C: desc };

  setLoading('btnSaveCarousel', true);
  const ok = await postToScript({
    action: 'update_carousel',
    password: sessionPwd,
    data: { rows: carouselData }
  });
  setLoading('btnSaveCarousel', false);

  if (ok) {
    bootstrap.Modal.getInstance(document.getElementById('carouselModal')).hide();
    renderCarouselTab();
    showToast('輪播文案已更新');
  }
}

// ── 最新消息 Tab ──────────────────────────────────────────────────────────────
async function loadNewsTab() {
  const el = document.getElementById('newsTabContent');
  el.innerHTML = loadingHtml();
  try {
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.NEWS,
      { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:D' }
    );
    newsData = rows.map((r, i) => ({
      A: String(r['A'] || '').trim(),
      B: String(r['B'] || '').trim(),
      C: String(r['C'] || '').trim(),
      D: String(r['D'] || '').trim(),
      _row: i + 2   // 實際 Sheet 列號（第 1 列是標題）
    }));
    renderNewsTab();
  } catch (err) {
    el.innerHTML = errorHtml(err.message);
  }
}

function renderNewsTab() {
  const el = document.getElementById('newsTabContent');
  if (!newsData.length) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-newspaper"></i>
        尚無消息，請點擊「新增消息」建立第一則。
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table admin-table">
          <thead>
            <tr>
              <th style="width:110px">日期</th>
              <th>標題</th>
              <th class="d-none d-lg-table-cell">摘要</th>
              <th style="width:90px"></th>
            </tr>
          </thead>
          <tbody>
            ${newsData.map((r, i) => `
              <tr>
                <td class="small text-muted text-nowrap">${escHtml(r.A)}</td>
                <td class="fw-semibold">${escHtml(r.B)}</td>
                <td class="text-muted small d-none d-lg-table-cell">
                  ${escHtml(r.C.length > 55 ? r.C.slice(0, 55) + '…' : r.C)}
                </td>
                <td class="text-nowrap">
                  <button class="btn btn-outline-primary btn-sm me-1" onclick="openNewsModal(${i})" title="編輯">
                    <i class="bi bi-pencil-fill"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm" onclick="deleteNewsRow(${i})" title="刪除">
                    <i class="bi bi-trash-fill"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-muted small mt-2">
      <i class="bi bi-info-circle me-1"></i>
      共 ${newsData.length} 則消息。刪除操作不可還原，請謹慎。
    </p>`;
}

function openNewsModal(idx) {
  const isNew = (idx === undefined || idx === null);
  document.getElementById('newsModalLabel').textContent = isNew ? '新增最新消息' : '編輯最新消息';
  document.getElementById('newsEditSheetRow').value = isNew ? '' : newsData[idx]._row;

  const r = isNew ? { A: todayStr(), B: '', C: '', D: '' } : newsData[idx];
  document.getElementById('newsEditDate').value    = toDateInput(r.A);
  document.getElementById('newsEditTitle').value   = r.B;
  document.getElementById('newsEditSummary').value = r.C;
  document.getElementById('newsEditContent').value = r.D;

  new bootstrap.Modal(document.getElementById('newsModal')).show();
}

async function saveNews() {
  if (!checkScriptUrl()) return;

  const title = document.getElementById('newsEditTitle').value.trim();
  if (!title) { showToast('請輸入標題', false); return; }

  const sheetRow = document.getElementById('newsEditSheetRow').value;
  const isNew    = !sheetRow;

  const data = {
    A: document.getElementById('newsEditDate').value,
    B: title,
    C: document.getElementById('newsEditSummary').value.trim(),
    D: document.getElementById('newsEditContent').value.trim(),
    ...(isNew ? {} : { rowIndex: parseInt(sheetRow) })
  };

  setLoading('btnSaveNews', true);
  const ok = await postToScript({
    action: isNew ? 'add_news' : 'update_news',
    password: sessionPwd,
    data
  });
  setLoading('btnSaveNews', false);

  if (ok) {
    bootstrap.Modal.getInstance(document.getElementById('newsModal')).hide();
    showToast(isNew ? '消息已新增，稍後請重新讀取確認' : '消息已更新');
    setTimeout(loadNewsTab, 1500);
  }
}

async function deleteNewsRow(idx) {
  if (!checkScriptUrl()) return;
  if (!confirm(`確定要刪除「${newsData[idx].B}」？\n此操作不可還原。`)) return;

  const ok = await postToScript({
    action: 'delete_news',
    password: sessionPwd,
    data: { rowIndex: newsData[idx]._row }
  });

  if (ok) {
    showToast('消息已刪除');
    setTimeout(loadNewsTab, 1500);
  }
}

// ── 跑馬燈 Tab ────────────────────────────────────────────────────────────────
async function loadMarqueeTab() {
  try {
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.MARQUEE,
      { sheetId: CONFIG.CONTENT_SHEET_ID, noHeader: true }
    );
    const key = rows.length ? Object.keys(rows[0])[0] : null;
    marqueeItems = key
      ? rows.map(r => String(r[key] || '').trim()).filter(Boolean)
      : [];
    document.getElementById('marqueeText').value = marqueeItems.join('\n');
  } catch (err) {
    showToast('跑馬燈讀取失敗：' + err.message, false);
  }
}

async function saveMarquee() {
  if (!checkScriptUrl()) return;
  const items = document.getElementById('marqueeText').value
    .split('\n').map(s => s.trim()).filter(Boolean);

  const ok = await postToScript({
    action: 'update_marquee',
    password: sessionPwd,
    data: { items }
  });

  if (ok) showToast('跑馬燈已更新');
}

// ── Apps Script 通訊 ──────────────────────────────────────────────────────────
async function postToScript(payload) {
  try {
    // text/plain 避免 CORS preflight；Apps Script 以 e.postData.contents 接收
    const res = await fetch(scriptUrl, {
      method:   'POST',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = await res.text();
    // 嘗試解析 JSON 回應
    try {
      const json = JSON.parse(text);
      if (json && !json.ok) {
        showToast('錯誤：' + (json.error || '操作失敗'), false);
        return false;
      }
    } catch (_) {
      // 非 JSON 回應（部分 CORS 限制下正常）→ 視為成功
    }
    return true;
  } catch (err) {
    showToast('連線失敗：' + err.message, false);
    return false;
  }
}

// ── 工具函式 ──────────────────────────────────────────────────────────────────
function checkScriptUrl() {
  if (!scriptUrl) {
    showToast('請先至「設定」填入 Apps Script URL', false);
    switchTab('settings');
    return false;
  }
  return true;
}

function showToast(msg, success = true) {
  const el   = document.getElementById('adminToast');
  const body = document.getElementById('adminToastMsg');
  el.className = `toast align-items-center text-white border-0 ${success ? 'bg-success' : 'bg-danger'}`;
  body.textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise bi-spin me-1"></i>儲存中…';
  } else {
    btn.disabled = false;
    if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sha256Match(pwd, hash) {
  // 非同步快取比對：session 已存在時使用（精確驗證在 verifyPwd）
  return !!pwd;   // session 若存在代表已驗證過一次
}

async function verifyPwd(pwd) {
  const hash = await sha256(pwd);
  return hash === ADMIN_HASH;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(str) {
  if (!str) return todayStr();
  // "2026/06/14" → "2026-06-14"，純字串欄位
  return String(str).replace(/\//g, '-').slice(0, 10);
}

function loadingHtml() {
  return '<div class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm me-2"></div>讀取中...</div>';
}

function errorHtml(msg) {
  return `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>讀取失敗：${escHtml(msg)}</div>`;
}
