import { createI18n } from 'vue-i18n';

const defaultLang = typeof localStorage !== 'undefined'
  ? localStorage.getItem('app_lang') || 'vi'
  : 'vi';

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
  const nextLang = i18n.global.locale.value === 'vi' ? 'en' : 'vi';
  i18n.global.locale.value = nextLang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('app_lang', nextLang);
  }
}
