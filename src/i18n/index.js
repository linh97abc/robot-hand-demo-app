import { ref } from 'vue';

export const currentLang = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('app_lang') || 'vi'
    : 'vi'
);

export function setLang(lang) {
  currentLang.value = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('app_lang', lang);
  }
}

export function toggleLang() {
  setLang(currentLang.value === 'vi' ? 'en' : 'vi');
}

const translations = {
  vi: {
    // App Chrome & Headers
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
    jsonHint: 'Định dạng file: {"segments": [ {"waypoint": {"thumb.0": 10, ...}, "duration_ms": 800, "dwell_ms": 0}, ... ]}. duration_ms là thời gian chuyển động, dwell_ms là thời gian giữ tư thế.',
  },
  en: {
    // App Chrome & Headers
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
    jsonHint: 'File format: {"segments": [ {"waypoint": {"thumb.0": 10, ...}, "duration_ms": 800, "dwell_ms": 0}, ... ]}. duration_ms is motion duration, dwell_ms is hold time at waypoint.',
  }
};

export function t(key, params = {}) {
  const lang = currentLang.value;
  let text = translations[lang]?.[key] || translations['vi']?.[key] || key;
  for (const p in params) {
    text = text.replace(`{${p}}`, params[p]);
  }
  return text;
}
