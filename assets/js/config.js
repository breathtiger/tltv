/**
 * config.js — 天良衛星電視台網站設定
 *
 * SHEET_ID         → 頻道清單試算表 ID
 * CONTENT_SHEET_ID → 網站文字內容試算表 ID（carousel / marquee / news）
 *
 * 試算表均需「發布到網路」才能讀取。
 */
const CONFIG = {

  // ─── 頻道資料試算表 ───────────────────────────────────────
  SHEET_ID: '15UM-RcLVH0y9GgE11AbmbWKRVm_yjLNcSJtnHqrKL2k',
  SHEETS: {
    CHANNELS: '頻道清單',
  },

  // ─── 網站內容試算表 ───────────────────────────────────────
  CONTENT_SHEET_ID: '11Mp1nDCeDnTBQOUN9IZ6ign3XC1rEXyHLRIwDwZXTEg',
  CONTENT_SHEETS: {
    CAROUSEL: 'carousel',
    MARQUEE:  'marquee',
    NEWS:     'news',
    HOSTS:    'hosts',
    SEO:      'seo',
    SCHEDULE: 'schedule',
  },

  // ─── Google Drive ────────────────────────────────────────
  DRIVE_FOLDER_ID: '1YPCb89VCv7LmfaBcobdShQaldppYn55U',
};
