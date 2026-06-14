/* admin.js — 天良衛星電視台後台管理 */
'use strict';

/* ────────────────────────────────────────────────────
   常數 / 狀態
──────────────────────────────────────────────────── */
const ADMIN_HASH     = 'd18cb2eb634724f691a072efb47122726dd8a1dfdd0c514bb292c439c8c4b768';
const SCRIPT_URL_KEY = 'tltv_script_url';

let carouselData = [];   // [{idx, order, title, desc, image_id}]
let newsData     = [];   // [{sheetRow, date, title, summary, content, image_id}]
let hostsData    = [];   // [{idx, order, name, photo_id, program, active}]

/* ────────────────────────────────────────────────────
   啟動
──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('tltv_admin') === '1') showDashboard();
  bindLoginForm();
  bindTabNav();
  initScriptUrlField();
  bindTogglePwd();
});

/* ────────────────────────────────────────────────────
   登入 / 登出
──────────────────────────────────────────────────── */
function bindLoginForm() {
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pwd  = document.getElementById('loginPwd').value;
    const hash = await sha256(`${user}/${pwd}`);
    if (hash === ADMIN_HASH) {
      sessionStorage.setItem('tltv_admin', '1');
      showDashboard();
    } else {
      const el = document.getElementById('loginError');
      el.textContent = '帳號或密碼錯誤，請再試一次。';
      el.classList.remove('d-none');
    }
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('tltv_admin');
    document.getElementById('viewDashboard').classList.add('d-none');
    document.getElementById('viewLogin').classList.remove('d-none');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPwd').value  = '';
    document.getElementById('loginError').classList.add('d-none');
  });
}

function bindTogglePwd() {
  document.getElementById('togglePwd').addEventListener('click', () => {
    const inp  = document.getElementById('loginPwd');
    const icon = document.getElementById('togglePwdIcon');
    if (inp.type === 'password') { inp.type = 'text';     icon.className = 'bi bi-eye-slash'; }
    else                         { inp.type = 'password'; icon.className = 'bi bi-eye';       }
  });
}

function showDashboard() {
  document.getElementById('viewLogin').classList.add('d-none');
  document.getElementById('viewDashboard').classList.remove('d-none');
  activateTab('carousel');
  loadCarouselTab();
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ────────────────────────────────────────────────────
   Tab 導航
──────────────────────────────────────────────────── */
function bindTabNav() {
  document.querySelectorAll('#adminTabs .nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      activateTab(tab);
      if (tab === 'carousel') loadCarouselTab();
      if (tab === 'news')     loadNewsTab();
      if (tab === 'hosts')    loadHostsTab();
      if (tab === 'marquee')  loadMarqueeTab();
    });
  });
}

function activateTab(name) {
  document.querySelectorAll('#adminTabs .nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === name));
  document.querySelectorAll('.tab-body').forEach(b =>
    b.classList.toggle('d-none', b.id !== `tab-${name}`));
}

/* ────────────────────────────────────────────────────
   Apps Script 呼叫
──────────────────────────────────────────────────── */
function getScriptUrl() {
  return localStorage.getItem(SCRIPT_URL_KEY) || '';
}

async function callScript(payload) {
  const url = getScriptUrl();
  if (!url) throw new Error('尚未設定 Apps Script URL，請至「設定」頁面填入。');
  const res  = await fetch(url, {
    method:  'POST',
    body:    JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain' },
    redirect: 'follow',
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { return; }
  if (json && json.status !== 'ok') throw new Error(json.message || '伺服器回傳錯誤');
}

/* ────────────────────────────────────────────────────
   Toast / 共用 UI
──────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const el = document.getElementById('adminToast');
  el.classList.remove('bg-success', 'bg-danger', 'bg-warning');
  el.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
  document.getElementById('adminToastMsg').textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 }).show();
}

function setBtnLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = on;
  if (on) {
    btn._orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>儲存中…';
  } else {
    btn.innerHTML = btn._orig || btn.innerHTML;
  }
}

function loadingHtml() {
  return '<div class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm me-2"></div>載入中...</div>';
}

/* ────────────────────────────────────────────────────
   Drive 圖片預覽
──────────────────────────────────────────────────── */
function previewDriveImage(inputId, previewId) {
  const fileId = document.getElementById(inputId).value.trim();
  const img    = document.getElementById(previewId);
  if (!fileId) { img.style.display = 'none'; img.src = ''; return; }
  img.src = driveImgUrl(fileId, 400);
  img.style.display = 'block';
  img.onerror = () => { img.style.display = 'none'; };
}

/* ────────────────────────────────────────────────────
   設定 Tab
──────────────────────────────────────────────────── */
function initScriptUrlField() {
  const saved  = getScriptUrl();
  const status = document.getElementById('scriptUrlStatus');
  if (saved) {
    document.getElementById('scriptUrlInput').value = saved;
    status.textContent = '✅ 已設定（儲存於本瀏覽器）';
    status.className   = 'small mb-3 text-success';
  }
}

function saveScriptUrl() {
  const val    = document.getElementById('scriptUrlInput').value.trim();
  const status = document.getElementById('scriptUrlStatus');
  if (!val.startsWith('https://script.google.com/macros/s/')) {
    status.textContent = '❌ 格式不正確，URL 需以 https://script.google.com/macros/s/ 開頭';
    status.className   = 'small mb-3 text-danger';
    return;
  }
  localStorage.setItem(SCRIPT_URL_KEY, val);
  status.textContent = '✅ 已儲存';
  status.className   = 'small mb-3 text-success';
  showToast('Apps Script URL 已儲存');
}

/* ────────────────────────────────────────────────────
   輪播文案 Tab
──────────────────────────────────────────────────── */
async function loadCarouselTab() {
  const el = document.getElementById('carouselTabContent');
  el.innerHTML = loadingHtml();
  try {
    const rows = await fetchSheetData(CONFIG.CONTENT_SHEETS.CAROUSEL, {
      sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:D',
    });
    carouselData = rows.map((r, i) => ({
      idx:      i,
      order:    r['A'] || `banner_${i + 1}`,
      title:    r['B'] || '',
      desc:     r['C'] || '',
      image_id: r['D'] || '',
    }));
    renderCarouselTab();
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">讀取失敗：${escHtml(err.message)}</div>`;
  }
}

function renderCarouselTab() {
  const rows = carouselData.map(item => `
    <tr>
      <td class="align-middle text-muted small">${escHtml(item.order)}</td>
      <td class="align-middle">
        ${item.image_id
          ? `<img src="${driveImgUrl(item.image_id, 80)}" height="40" width="64"
               class="rounded me-2" style="object-fit:cover">
             <span class="font-monospace text-muted small">${escHtml(item.image_id.slice(0, 20))}…</span>`
          : '<span class="text-muted small">（使用本機圖片）</span>'}
      </td>
      <td class="align-middle fw-semibold">
        ${item.title ? escHtml(item.title) : '<span class="text-muted fst-italic">（空）</span>'}
      </td>
      <td class="align-middle text-muted small d-none d-md-table-cell">${escHtml(item.desc) || '—'}</td>
      <td class="align-middle text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="openCarouselModal(${item.idx})">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>`).join('');

  document.getElementById('carouselTabContent').innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width:90px">Banner</th>
              <th>輪播圖（Drive ID）</th>
              <th>標題</th>
              <th class="d-none d-md-table-cell">短說明</th>
              <th style="width:56px"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <p class="text-muted small mt-2"><i class="bi bi-info-circle me-1"></i>儲存後約 10–30 秒前台生效。</p>`;
}

function openCarouselModal(idx) {
  const item = carouselData[idx];
  document.getElementById('carouselEditIdx').value    = idx;
  document.getElementById('carouselEditOrder').value  = item.order;
  document.getElementById('carouselEditTitle').value  = item.title;
  document.getElementById('carouselEditDesc').value   = item.desc;
  document.getElementById('carouselEditImageId').value = item.image_id;
  previewDriveImage('carouselEditImageId', 'carouselImgPreview');
  document.getElementById('carouselModalLabel').textContent = `編輯輪播：${item.order}`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('carouselModal')).show();
}

async function saveCarouselRow() {
  const idx      = parseInt(document.getElementById('carouselEditIdx').value);
  const title    = document.getElementById('carouselEditTitle').value.trim();
  const desc     = document.getElementById('carouselEditDesc').value.trim();
  const image_id = document.getElementById('carouselEditImageId').value.trim();

  carouselData[idx] = { ...carouselData[idx], title, desc, image_id };
  const allRows = carouselData.map(r => [r.order, r.title, r.desc, r.image_id]);

  setBtnLoading('btnSaveCarousel', true);
  try {
    await callScript({ action: 'update_carousel', rows: allRows });
    showToast(`${carouselData[idx].order} 已儲存`);
    bootstrap.Modal.getInstance(document.getElementById('carouselModal')).hide();
    renderCarouselTab();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading('btnSaveCarousel', false);
  }
}

/* ────────────────────────────────────────────────────
   最新消息 Tab
──────────────────────────────────────────────────── */
async function loadNewsTab() {
  const el = document.getElementById('newsTabContent');
  el.innerHTML = loadingHtml();
  try {
    const rows = await fetchSheetData(CONFIG.CONTENT_SHEETS.NEWS, {
      sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:E',
    });
    newsData = rows.map((r, i) => ({
      sheetRow: i + 2,
      date:     r['A'] || '',
      title:    r['B'] || '',
      summary:  r['C'] || '',
      content:  r['D'] || '',
      image_id: r['E'] || '',
    }));
    renderNewsTab();
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">讀取失敗：${escHtml(err.message)}</div>`;
  }
}

function renderNewsTab() {
  if (!newsData.length) {
    document.getElementById('newsTabContent').innerHTML =
      `<div class="text-center text-muted py-5">
         <i class="bi bi-newspaper fs-2 d-block mb-2"></i>
         尚無消息，點擊「新增消息」開始新增
       </div>`;
    return;
  }
  const rows = newsData.map((item, i) => `
    <tr>
      <td class="align-middle text-muted small text-nowrap">${escHtml(item.date)}</td>
      <td class="align-middle">
        ${item.image_id
          ? `<img src="${driveImgUrl(item.image_id, 60)}" height="36" width="54"
               class="rounded me-1" style="object-fit:cover">`
          : '<i class="bi bi-image text-muted me-1"></i>'}
        <span class="fw-semibold">${escHtml(item.title)}</span>
      </td>
      <td class="align-middle text-muted small d-none d-md-table-cell" style="max-width:200px">
        <div class="text-truncate">${escHtml(item.summary)}</div>
      </td>
      <td class="align-middle text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openNewsModal(${i})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteNews(${i})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');

  document.getElementById('newsTabContent').innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:110px">日期</th>
              <th>標題</th>
              <th class="d-none d-md-table-cell">摘要</th>
              <th style="width:90px"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function openNewsModal(idx) {
  const isNew = (idx === undefined);
  document.getElementById('newsModalLabel').textContent = isNew ? '新增最新消息' : '編輯最新消息';
  document.getElementById('newsEditSheetRow').value = isNew ? '' : newsData[idx].sheetRow;

  if (isNew) {
    document.getElementById('newsEditDate').value    = new Date().toISOString().slice(0, 10);
    document.getElementById('newsEditTitle').value   = '';
    document.getElementById('newsEditSummary').value = '';
    document.getElementById('newsEditContent').value = '';
    document.getElementById('newsEditImageId').value = '';
    document.getElementById('newsImgPreview').style.display = 'none';
  } else {
    const item = newsData[idx];
    document.getElementById('newsEditDate').value    = item.date.replace(/\//g, '-').slice(0, 10);
    document.getElementById('newsEditTitle').value   = item.title;
    document.getElementById('newsEditSummary').value = item.summary;
    document.getElementById('newsEditContent').value = item.content;
    document.getElementById('newsEditImageId').value = item.image_id;
    previewDriveImage('newsEditImageId', 'newsImgPreview');
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('newsModal')).show();
}

async function saveNews() {
  const date     = document.getElementById('newsEditDate').value.trim();
  const title    = document.getElementById('newsEditTitle').value.trim();
  const summary  = document.getElementById('newsEditSummary').value.trim();
  const content  = document.getElementById('newsEditContent').value.trim();
  const image_id = document.getElementById('newsEditImageId').value.trim();
  const sheetRow = document.getElementById('newsEditSheetRow').value;

  if (!date || !title) { showToast('日期和標題為必填', 'danger'); return; }

  const isNew = !sheetRow;
  setBtnLoading('btnSaveNews', true);
  try {
    const payload = isNew
      ? { action: 'add_news', date, title, summary, content, image_id }
      : { action: 'update_news', row: parseInt(sheetRow), date, title, summary, content, image_id };
    await callScript(payload);
    showToast(isNew ? '消息已新增' : '消息已更新');
    bootstrap.Modal.getInstance(document.getElementById('newsModal')).hide();
    setTimeout(loadNewsTab, 1200);
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading('btnSaveNews', false);
  }
}

async function deleteNews(idx) {
  const item = newsData[idx];
  if (!confirm(`確定要刪除「${item.title}」？此操作不可還原。`)) return;
  try {
    await callScript({ action: 'delete_news', row: item.sheetRow });
    showToast('消息已刪除');
    setTimeout(loadNewsTab, 1200);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

/* ────────────────────────────────────────────────────
   主持人 Tab
──────────────────────────────────────────────────── */
async function loadHostsTab() {
  const el = document.getElementById('hostsTabContent');
  el.innerHTML = loadingHtml();
  try {
    const rows = await fetchSheetData(CONFIG.CONTENT_SHEETS.HOSTS, {
      sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:E',
    });
    hostsData = rows.map((r, i) => ({
      idx:      i,
      order:    parseInt(r['A']) || (i + 1),
      name:     r['B'] || '',
      photo_id: r['C'] || '',
      program:  r['D'] || '',
      active:   String(r['E'] || '').toUpperCase() !== 'FALSE',
    })).sort((a, b) => a.order - b.order);
    renderHostsTab();
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">讀取失敗：${escHtml(err.message)}<br><small class="text-muted">若尚未建立 hosts 工作表，請先新增一位主持人，系統會自動建立。</small></div>`;
  }
}

function renderHostsTab() {
  if (!hostsData.length) {
    document.getElementById('hostsTabContent').innerHTML =
      `<div class="text-center text-muted py-5">
         <i class="bi bi-people fs-2 d-block mb-2"></i>
         尚無主持人資料，點擊「新增主持人」開始新增
       </div>`;
    return;
  }

  const rows = hostsData.map((h, i) => `
    <tr>
      <td class="align-middle">
        <div class="d-flex flex-column gap-1" style="width:32px">
          <button class="btn btn-outline-secondary btn-xs p-0 lh-1" style="font-size:.7rem"
            onclick="moveHost(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn btn-outline-secondary btn-xs p-0 lh-1" style="font-size:.7rem"
            onclick="moveHost(${i},1)" ${i === hostsData.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      </td>
      <td class="align-middle">
        ${h.photo_id
          ? `<img src="${driveImgUrl(h.photo_id, 80)}" width="44" height="44"
               class="rounded-circle" style="object-fit:cover">`
          : `<span class="d-inline-flex align-items-center justify-content-center bg-secondary
               text-white rounded-circle" style="width:44px;height:44px">
               <i class="bi bi-person"></i></span>`}
      </td>
      <td class="align-middle fw-semibold">${escHtml(h.name)}</td>
      <td class="align-middle text-muted small">${escHtml(h.program) || '—'}</td>
      <td class="align-middle">
        <span class="badge ${h.active ? 'bg-success' : 'bg-secondary'}">
          ${h.active ? '顯示' : '隱藏'}
        </span>
      </td>
      <td class="align-middle text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openHostModal(${i})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteHost(${i})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');

  document.getElementById('hostsTabContent').innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:44px">順序</th>
              <th style="width:60px">照片</th>
              <th>姓名</th>
              <th>節目</th>
              <th style="width:70px">狀態</th>
              <th style="width:90px"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="card-footer bg-white border-0 pb-3 pt-2">
        <button class="btn btn-warning btn-sm" onclick="saveAllHosts()">
          <i class="bi bi-arrow-up-circle me-1"></i>儲存排列順序
        </button>
        <span class="text-muted small ms-2">上下移動後請點此儲存</span>
      </div>
    </div>`;
}

function openHostModal(idx) {
  const isNew = (idx === undefined);
  document.getElementById('hostModalLabel').textContent = isNew ? '新增主持人' : '編輯主持人';
  document.getElementById('hostEditIdx').value = isNew ? '' : idx;

  if (isNew) {
    document.getElementById('hostEditName').value    = '';
    document.getElementById('hostEditPhotoId').value = '';
    document.getElementById('hostEditProgram').value = '';
    document.getElementById('hostEditActive').checked = true;
    document.getElementById('hostPhotoPreview').style.display = 'none';
  } else {
    const h = hostsData[idx];
    document.getElementById('hostEditName').value    = h.name;
    document.getElementById('hostEditPhotoId').value = h.photo_id;
    document.getElementById('hostEditProgram').value = h.program;
    document.getElementById('hostEditActive').checked = h.active;
    previewDriveImage('hostEditPhotoId', 'hostPhotoPreview');
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('hostModal')).show();
}

async function saveHost() {
  const idxStr   = document.getElementById('hostEditIdx').value;
  const name     = document.getElementById('hostEditName').value.trim();
  const photo_id = document.getElementById('hostEditPhotoId').value.trim();
  const program  = document.getElementById('hostEditProgram').value.trim();
  const active   = document.getElementById('hostEditActive').checked;

  if (!name) { showToast('姓名為必填', 'danger'); return; }

  const isNew = (idxStr === '');
  setBtnLoading('btnSaveHost', true);
  try {
    if (isNew) {
      const newOrder = hostsData.length > 0 ? Math.max(...hostsData.map(h => h.order)) + 1 : 1;
      await callScript({
        action: 'add_host',
        order: newOrder, name, photo_id, program,
        active: active ? 'TRUE' : 'FALSE',
      });
      showToast(`${name} 已新增`);
    } else {
      const idx = parseInt(idxStr);
      hostsData[idx] = { ...hostsData[idx], name, photo_id, program, active };
      await callScript({
        action: 'update_all_hosts',
        hosts: hostsData.map((h, i) => ({
          order: i + 1, name: h.name, photo_id: h.photo_id,
          program: h.program, active: h.active ? 'TRUE' : 'FALSE',
        })),
      });
      showToast(`${name} 已更新`);
    }
    bootstrap.Modal.getInstance(document.getElementById('hostModal')).hide();
    setTimeout(loadHostsTab, 1200);
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading('btnSaveHost', false);
  }
}

async function deleteHost(idx) {
  const h = hostsData[idx];
  if (!confirm(`確定要刪除「${h.name}」？`)) return;
  hostsData.splice(idx, 1);
  try {
    await callScript({
      action: 'update_all_hosts',
      hosts: hostsData.map((hh, i) => ({
        order: i + 1, name: hh.name, photo_id: hh.photo_id,
        program: hh.program, active: hh.active ? 'TRUE' : 'FALSE',
      })),
    });
    showToast(`${h.name} 已刪除`);
    renderHostsTab();
  } catch (err) {
    showToast(err.message, 'danger');
    loadHostsTab();
  }
}

function moveHost(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= hostsData.length) return;
  [hostsData[idx], hostsData[to]] = [hostsData[to], hostsData[idx]];
  renderHostsTab();
}

async function saveAllHosts() {
  try {
    await callScript({
      action: 'update_all_hosts',
      hosts: hostsData.map((h, i) => ({
        order: i + 1, name: h.name, photo_id: h.photo_id,
        program: h.program, active: h.active ? 'TRUE' : 'FALSE',
      })),
    });
    showToast('主持人順序已儲存');
    setTimeout(loadHostsTab, 1200);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

/* ────────────────────────────────────────────────────
   跑馬燈 Tab
──────────────────────────────────────────────────── */
async function loadMarqueeTab() {
  try {
    // noHeader: true → 與 main.js 一致，從 row 1 讀取（無標題列）
    const rows = await fetchSheetData(CONFIG.CONTENT_SHEETS.MARQUEE, {
      sheetId: CONFIG.CONTENT_SHEET_ID, noHeader: true,
    });
    const firstKey = rows.length ? Object.keys(rows[0])[0] : null;
    const items = firstKey
      ? rows.map(r => String(r[firstKey] || '').trim()).filter(Boolean)
      : [];
    document.getElementById('marqueeText').value = items.join('\n');
  } catch (err) {
    showToast('跑馬燈讀取失敗：' + err.message, 'danger');
  }
}

async function saveMarquee() {
  const lines = document.getElementById('marqueeText').value
    .split('\n').map(l => l.trim()).filter(Boolean);
  try {
    await callScript({ action: 'update_marquee', lines });
    showToast('跑馬燈已儲存');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
