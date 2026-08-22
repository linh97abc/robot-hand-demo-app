import { createI18n } from 'vue-i18n';

const defaultLang = typeof localStorage !== 'undefined'
  ? localStorage.getItem('app_lang') || 'vi'
  : 'vi';

export const supportedLangs = [
  { code: 'vi', label: 'VI' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: 'ZH' },
];

const messages = {
  vi: {
    // Model Switcher & Header
    robotModelLabel: 'MÔ HÌNH ROBOT',
    stageHint: 'Kéo chuột để quay · cuộn để phóng to/thu nhỏ · chuột phải để trượt',
    downloadObj: 'Tải OBJ + MTL',
    downloadGlb: 'Tải GLB',
    
    // Current Pose / Joint Control Panel Chrome
    currentPose: 'TƯ THẾ HIỆN TẠI',
    statusPlaying: 'Đang phát chuỗi chuyển động — dừng phát để chỉnh sửa',
    statusEditing: 'Đang chỉnh sửa {name} — bấm WP lần nữa để hoàn thành',
    statusCreating: 'Tạo tư thế mới — bấm "+ Thêm Waypoint" để lưu',
    loadingModel: 'Đang nạp mô hình 3D...',

    // Motion Sequence Panel Chrome
    motionSequence: 'CHUỖI CHUYỂN ĐỘNG',
    motionSeqDesc: 'Lưu tư thế hiện tại thành waypoint. Chọn waypoint để sửa tư thế. Xuất/nhập file JSON để tái sử dụng chuỗi.',
    exportJson: 'Xuất JSON',
    importJson: 'Nhập JSON',
    addWaypoint: '+ Thêm Waypoint',
    play: '► Phát',
    pause: '⏸ Tạm dừng',
    stop: '■ Dừng',
    loop: '↻ Lặp',
    colWaypoint: 'WAYPOINT',
    colDuration: 'THỜI LƯỢNG (ms)',
    colDwell: 'TẠM DỪNG (ms)',
    noWaypoints: 'Chưa có waypoint nào. Bấm "+ Thêm Waypoint" để tạo chuỗi.',
    jsonHint: 'Định dạng file JSON: segments -> waypoint (khớp: giá_trị), duration_ms (thời gian chuyển động), dwell_ms (thời gian tạm dừng).',
  },
  en: {
    // Model Switcher & Header
    robotModelLabel: 'ROBOT MODEL',
    stageHint: 'Drag to orbit · scroll to zoom · right-drag to pan',
    downloadObj: 'Download OBJ + MTL',
    downloadGlb: 'Download GLB',
    
    // Current Pose / Joint Control Panel Chrome
    currentPose: 'CURRENT POSE',
    statusPlaying: 'Playing motion sequence — stop playback to edit',
    statusEditing: 'Editing {name} — click WP again to complete',
    statusCreating: 'Creating new pose — click "+ Add Waypoint" to save',
    loadingModel: 'Loading 3D model...',

    // Motion Sequence Panel Chrome
    motionSequence: 'MOTION SEQUENCE',
    motionSeqDesc: 'Record current pose into waypoints. Select a waypoint to edit its pose using joint sliders. Export or import JSON files to reuse sequences.',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    addWaypoint: '+ Add Waypoint',
    play: '► Play',
    pause: '⏸ Pause',
    stop: '■ Stop',
    loop: '↻ Loop',
    colWaypoint: 'WAYPOINT',
    colDuration: 'DURATION (ms)',
    colDwell: 'DWELL (ms)',
    noWaypoints: 'No waypoints yet. Click "+ Add Waypoint" to create a motion sequence.',
    jsonHint: 'JSON file format: segments -> waypoint (joint: value), duration_ms (motion duration), dwell_ms (hold time).',
  },
  zh: {
    // Model Switcher & Header
    robotModelLabel: '机器人模型',
    stageHint: '拖动旋转 · 滚动缩放 · 右键平移',
    downloadObj: '下载 OBJ + MTL',
    downloadGlb: '下载 GLB',
    
    // Current Pose / Joint Control Panel Chrome
    currentPose: '当前姿态',
    statusPlaying: '正在播放动作序列 — 停止播放以编辑',
    statusEditing: '正在编辑 {name} — 再次点击 WP 完成编辑',
    statusCreating: '创建新姿态 — 点击 "+ 添加航点" 保存',
    loadingModel: '正在加载 3D 模型...',

    // Motion Sequence Panel Chrome
    motionSequence: '动作序列',
    motionSeqDesc: '将当前姿态记录为航点。选择航点以编辑其关节角度。导出或导入 JSON 文件以复用序列。',
    exportJson: '导出 JSON',
    importJson: '导入 JSON',
    addWaypoint: '+ 添加航点',
    play: '► 播放',
    pause: '⏸ 暂停',
    stop: '■ 停止',
    loop: '↻ 循环',
    colWaypoint: '航点',
    colDuration: '时长 (ms)',
    colDwell: '停顿 (ms)',
    noWaypoints: '暂无航点。点击 "+ 添加航点" 创建动作序列。',
    jsonHint: 'JSON 文件格式: segments -> waypoint (关节: 数值), duration_ms (动作时长), dwell_ms (停顿时间)。',
  }
};

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLang,
  fallbackLocale: 'en',
  messages,
});

export function toggleLang() {
  const current = i18n.global.locale.value;
  const idx = supportedLangs.findIndex(l => l.code === current);
  const nextLang = supportedLangs[(idx + 1) % supportedLangs.length].code;
  i18n.global.locale.value = nextLang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('app_lang', nextLang);
  }
}
