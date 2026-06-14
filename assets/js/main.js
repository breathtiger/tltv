// ── 主持人備用資料（hosts 工作表空白時使用）──────────────────────────────────
const HOSTS_FALLBACK = [
  { name: '方樺',        photo: 'assets/img/host/方樺1.png' },
  { name: '阿清',        photo: 'assets/img/host/阿清.JPG' },
  { name: '阿狗',        photo: 'assets/img/host/阿狗.JPG' },
  { name: '雅鈞',        photo: 'assets/img/host/雅鈞.PNG' },
  { name: '明豐',        photo: 'assets/img/host/明豐_2.png' },
  { name: '裕龍',        photo: 'assets/img/host/裕龍.png' },
  { name: '文祥',        photo: 'assets/img/host/文祥.png' },
  { name: '冠軍',        photo: 'assets/img/host/冠軍.jpg' },
  { name: '冠儒',        photo: 'assets/img/host/冠儒.JPG' },
  { name: '家鈺',        photo: 'assets/img/host/家鈺.JPG' },
  { name: '惠珍',        photo: 'assets/img/host/惠珍.JPG' },
  { name: '馥桂',        photo: 'assets/img/host/馥桂.png' },
  { name: '晨洋',        photo: 'assets/img/host/晨洋.jpg' },
  { name: '童茵',        photo: 'assets/img/host/童茵.jpg' },
  { name: '儀柔',        photo: 'assets/img/host/儀柔.jpg' },
  { name: '凱蒂',        photo: 'assets/img/host/凱蒂.png' },
  { name: '緒繐',        photo: 'assets/img/host/緒繐1.png' },
  { name: '嘉成 & 明明', photo: 'assets/img/host/嘉成明明.jpg' },
  { name: '文揮 & 紫涵', photo: 'assets/img/host/文揮紫涵.png' },
  { name: '阿狗 & 緒繐', photo: 'assets/img/host/阿狗+緒繐01.png' },
];

// ── 最新消息備用資料（news 工作表空白時顯示）────────────────────────────────
const SAMPLE_NEWS = [
  {
    '發布日期': '2026/06/14',
    '標題': '天良衛星電視台重新開幕，精彩節目陪您天天看！',
    '摘要': '天良衛星電視台歷經全新改版後重磅回歸，帶來歌唱、生活、健康等多元節目內容，全新主持陣容每天精彩不間斷，歡迎新舊觀眾鎖定收看。',
    'image_id': '',
  },
  {
    '發布日期': '2026/06/10',
    '標題': '115 年度全省有線電視頻道位置更新公告',
    '摘要': '本台依 NCC 最新規範完成 115 年度全省頻道位置調整。各縣市系統台最新頻道號碼已更新至本網站「頻道查詢」專區，如有疑問請撥免費客服 0800-083-567。',
    'image_id': '',
  },
  {
    '發布日期': '2026/06/01',
    '標題': '《歡唱好時光》全新改版登場，知名主持人強力助陣',
    '摘要': '深受觀眾喜愛的《歡唱好時光》全新改版！台語、國語經典好歌搭配方樺、阿清、雅鈞等知名主持人，帶給您滿滿歡樂。請鎖定各地系統台天良頻道準時收看。',
    'image_id': '',
  },
];

// ── 初始化 ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();
  initHostModal();
  // 主持人從 Sheets 讀取，完成後建立輪播
  loadHosts().then(hosts => initHostCarousel(hosts));
  Promise.allSettled([
    loadCarouselText(),
    loadMarquee(),
    loadNews(),
    loadChannels(),
  ]);
});

// ── Banner 輪播文字 + 圖片（從 carousel 工作表讀取）──────────────────────────

async function loadCarouselText() {
  try {
    // range=A2:D → A=順序, B=標題, C=短說明, D=輪播圖 Drive File ID
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.CAROUSEL,
      { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:D' }
    );
    rows.forEach(r => {
      const m = String(r['A'] || '').match(/(\d+)/);
      if (!m) return;
      const idx = parseInt(m[1]) - 1;   // banner_1 → 0

      // 若 D 欄有 Drive File ID，替換輪播圖
      const imageId = String(r['D'] || '').trim();
      if (imageId) {
        const imgEl = document.querySelector(
          `#bannerCarousel .carousel-item:nth-child(${idx + 1}) .banner-slide-img`
        );
        if (imgEl) {
          imgEl.src = driveImgUrl(imageId, 1400);
          imgEl.onerror = function () {
            this.src = `assets/img/carousel/banner_${idx + 1}.png`;
          };
        }
      }

      // 更新文字 caption
      const el = document.getElementById(`caption-${idx}`);
      if (!el) return;
      const title = String(r['B'] || '').trim();
      const desc  = String(r['C'] || '').trim();
      if (!title && !desc) return;
      el.innerHTML = `
        <div class="container">
          <p class="hero-sub">Tien Liang TV</p>
          <h2 class="hero-title">${escHtml(title)}</h2>
          ${desc ? `<p class="hero-desc">${escHtml(desc)}</p>` : ''}
        </div>`;
    });
  } catch (e) {
    const el = document.getElementById('caption-0');
    if (el) el.innerHTML = `
      <div class="container">
        <p class="hero-sub">Tien Liang TV</p>
        <h2 class="hero-title">天良衛星電視台</h2>
        <p class="hero-desc">提供優質衛星電視節目，服務全省觀眾</p>
      </div>`;
    console.warn('[CarouselText]', e.message);
  }
}

// ── 跑馬燈（從 marquee 工作表讀取）──────────────────────────────────────────

async function loadMarquee() {
  const el = document.getElementById('tickerItems');
  try {
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.MARQUEE,
      { sheetId: CONFIG.CONTENT_SHEET_ID, noHeader: true }
    );
    const firstKey = rows.length ? Object.keys(rows[0])[0] : null;
    const items = firstKey
      ? rows.map(r => String(r[firstKey] ?? '').trim()).filter(Boolean)
      : [];
    if (!items.length) {
      el.innerHTML = '<span class="opacity-75">天良衛星電視台，精彩節目每天陪伴您</span>';
      return;
    }
    const html = items.map(t => `<span>${escHtml(t)}</span>`).join('');
    el.innerHTML = html + html;
  } catch (e) {
    el.innerHTML = '<span class="opacity-75">天良衛星電視台，精彩節目每天陪伴您</span>';
    console.warn('[Marquee]', e.message);
  }
}

// ── 最新消息（從 news 工作表讀取，空白時用備用資料）──────────────────────────

async function loadNews() {
  const grid = document.getElementById('announcementGrid');
  let rows = [];
  try {
    // range=A2:E → A=日期 B=標題 C=摘要 D=內容 E=封面圖 Drive ID
    const fetched = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.NEWS,
      { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:E' }
    );
    rows = fetched
      .filter(r => r['B'])
      .map(r => ({
        '發布日期': String(r['A'] || '').trim(),
        '標題':     String(r['B'] || '').trim(),
        '摘要':     String(r['C'] || '').trim(),
        '內容':     String(r['D'] || '').trim(),
        'image_id': String(r['E'] || '').trim(),
      }));
  } catch (e) {
    console.warn('[News]', e.message);
  }
  if (!rows.length) rows = SAMPLE_NEWS;
  renderNewsGrid(rows, grid);
}

function renderNewsGrid(items, grid) {
  grid.innerHTML = items.map(a => {
    const imgId = a['image_id'] || '';
    const imgHtml = imgId
      ? `<img src="${driveImgUrl(imgId, 400)}" class="card-img-top"
           style="height:180px;object-fit:cover" alt="${escHtml(a['標題'] || '')}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="ann-img-placeholder" style="display:none"><i class="bi bi-newspaper"></i></div>`
      : `<div class="ann-img-placeholder"><i class="bi bi-newspaper"></i></div>`;
    return `
    <div class="col-md-6 col-lg-4">
      <div class="card announcement-card h-100">
        ${imgHtml}
        <div class="card-body d-flex flex-column">
          <p class="announcement-date mb-1">
            <i class="bi bi-calendar3 me-1"></i>${escHtml(a['發布日期'] || '')}
          </p>
          <h5 class="card-title">${escHtml(a['標題'] || '')}</h5>
          <p class="card-text text-muted small flex-grow-1">${escHtml(a['摘要'] || '')}</p>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── 主持人（從 hosts 工作表讀取，空白時用備用陣列）──────────────────────────

async function loadHosts() {
  try {
    // range=A2:E → A=order B=name C=photo_id D=program E=active
    const rows = await fetchSheetData(
      CONFIG.CONTENT_SHEETS.HOSTS,
      { sheetId: CONFIG.CONTENT_SHEET_ID, range: 'A2:E' }
    );
    const hosts = rows
      .filter(r => r['B'] && String(r['E'] || 'TRUE').toUpperCase() !== 'FALSE')
      .sort((a, b) => (parseInt(a['A']) || 999) - (parseInt(b['A']) || 999))
      .map(r => ({
        name:    String(r['B']).trim(),
        photo:   String(r['C'] || '').trim() ? driveImgUrl(String(r['C']).trim()) : null,
        program: String(r['D'] || '').trim(),
      }));
    return hosts.length ? hosts : HOSTS_FALLBACK;
  } catch (e) {
    console.warn('[Hosts]', e.message);
    return HOSTS_FALLBACK;
  }
}

// ── 主持人輪播（4 個一組 + 點擊放大 Modal）───────────────────────────────────

function initHostCarousel(hosts) {
  const inner      = document.getElementById('carouselInner');
  const indicators = document.getElementById('carouselIndicators');
  const SLIDE_SIZE = 4;
  const slides     = [];

  for (let i = 0; i < hosts.length; i += SLIDE_SIZE) {
    slides.push(hosts.slice(i, i + SLIDE_SIZE));
  }

  inner.innerHTML = slides.map((slide, idx) => `
    <div class="carousel-item ${idx === 0 ? 'active' : ''}">
      <div class="row g-3">
        ${slide.map(h => {
          const photoSrc = h.photo || '';
          return `
          <div class="col-6 col-md-3">
            <div class="card host-card h-100 text-center"
              role="button" tabindex="0" title="點擊放大"
              data-bs-toggle="modal" data-bs-target="#hostModal"
              data-host-name="${escHtml(h.name)}"
              data-host-photo="${escHtml(photoSrc)}"
              data-host-program="${escHtml(h.program || '')}">
              <div class="host-img-wrap">
                ${photoSrc
                  ? `<img src="${escHtml(photoSrc)}" class="host-avatar" alt="${escHtml(h.name)}"
                       onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                     <div class="host-img-placeholder" style="display:none"><i class="bi bi-person-fill"></i></div>`
                  : `<div class="host-img-placeholder"><i class="bi bi-person-fill"></i></div>`
                }
                <div class="host-zoom-overlay"><i class="bi bi-zoom-in"></i></div>
              </div>
              <div class="card-body py-2 px-2">
                ${h.program ? `<span class="host-program-badge d-inline-block mb-1">${escHtml(h.program)}</span>` : '<span class="host-program-badge d-inline-block mb-1">主持人</span>'}
                <h6 class="card-title mb-0 fw-bold">${escHtml(h.name)}</h6>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');

  indicators.innerHTML = slides.map((_, idx) => `
    <button type="button" data-bs-target="#hostCarousel" data-bs-slide-to="${idx}"
      ${idx === 0 ? 'class="active" aria-current="true"' : ''}
      aria-label="第 ${idx + 1} 頁"></button>`).join('');
}

// ── 主持人 Modal ──────────────────────────────────────────────────────────────

function initHostModal() {
  document.getElementById('hostModal').addEventListener('show.bs.modal', e => {
    const card = e.relatedTarget;
    if (!card) return;
    document.getElementById('hostModalName').textContent    = card.dataset.hostName    || '';
    document.getElementById('hostModalProgram').textContent = card.dataset.hostProgram || '';
    document.getElementById('hostModalImg').src             = card.dataset.hostPhoto   || '';
    document.getElementById('hostModalImg').alt             = card.dataset.hostName    || '';
  });
  document.getElementById('hostModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('hostModalImg').src = '';
  });
}

// ── 頻道清單（動態欄位，從 SHEET_ID 讀取）───────────────────────────────────

let allChannels    = [];
let channelHeaders = [];
let countyColKey   = '';

async function loadChannels() {
  const container = document.getElementById('channelTableContainer');
  try {
    allChannels = await fetchSheetData(CONFIG.SHEETS.CHANNELS, { range: 'A2:Z' });
    if (!allChannels.length) throw new Error('試算表資料為空，請確認工作表有資料列');

    channelHeaders = Object.keys(allChannels[0]);
    countyColKey = channelHeaders.find(h =>
      /^(縣市別?|地區|區域|county)$/i.test(h)
    ) || channelHeaders[0];

    let _lastCounty = '';
    allChannels = allChannels.map(r => {
      const val = r[countyColKey];
      if (val != null && String(val).trim()) _lastCounty = String(val).trim();
      return _lastCounty ? { ...r, [countyColKey]: _lastCounty } : r;
    });

    populateCountySelect(allChannels);
    renderChannelTable(allChannels);

    document.getElementById('countySelect').addEventListener('change', filterChannels);
    document.getElementById('operatorInput').addEventListener('input', filterChannels);
    document.getElementById('clearChannelFilter').addEventListener('click', () => {
      document.getElementById('countySelect').value = '';
      document.getElementById('operatorInput').value = '';
      renderChannelTable(allChannels);
    });
  } catch (e) {
    container.innerHTML =
      `<div class="alert alert-warning">
         <i class="bi bi-exclamation-triangle me-2"></i>頻道資料載入失敗：${escHtml(e.message)}
       </div>`;
    console.warn('[Channels]', e.message);
  }
}

function populateCountySelect(rows) {
  const counties = [...new Set(rows.map(r => r[countyColKey]).filter(Boolean))].sort();
  const sel = document.getElementById('countySelect');
  counties.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function filterChannels() {
  const county  = document.getElementById('countySelect').value;
  const keyword = document.getElementById('operatorInput').value.trim().toLowerCase();
  const filtered = allChannels.filter(r => {
    const matchCounty  = !county  || r[countyColKey] === county;
    const matchKeyword = !keyword || Object.values(r).some(v =>
      String(v ?? '').toLowerCase().includes(keyword)
    );
    return matchCounty && matchKeyword;
  });
  renderChannelTable(filtered);
}

function renderChannelTable(rows) {
  const container = document.getElementById('channelTableContainer');
  if (!rows.length) {
    container.innerHTML = '<div class="alert alert-info">查無符合條件的頻道資料。</div>';
    return;
  }
  container.innerHTML = `
    <div class="table-responsive shadow-sm rounded">
      <table class="table table-striped table-hover align-middle mb-0">
        <thead>
          <tr>${channelHeaders.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r =>
            `<tr>${channelHeaders.map(h =>
              `<td>${escHtml(String(r[h] ?? ''))}</td>`
            ).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-muted small mt-2 mb-0">共 ${rows.length} 筆資料</p>`;
}

// ── Back to Top ──────────────────────────────────────────────────────────────

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 500 ? 'flex' : 'none';
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
