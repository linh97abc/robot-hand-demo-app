# Robot Hand Rig — Tauri app

Bàn tay robot (three.js) — 2 model song song nạp từ file `.glb` (5 ngón dạng người, 3 ngón dạng gripper công nghiệp), điều khiển từng khớp qua bảng trượt, chuyển đổi model bằng nút trên panel, đóng gói desktop app bằng Tauri 2.

## Cấu trúc
- `src/App.vue` — layout chính Vue 3 + quản lý trạng thái khớp.
- `src/components/ThreeStage.vue` — Vue component quản lý Three.js viewer (camera, ánh sáng, export OBJ/GLB).
- `src/components/ControlPanel.vue` — Vue component bảng điều khiển khớp & presets.
- `public/assets/robot-hand5.glb` — file 3D GLB bàn tay 5 ngón.
- `public/assets/robot-hand3.glb` — file 3D GLB bàn tay 3 ngón (gripper).
- `src/models/hand-loader.js` — hàm nạp & rig mô hình 3D tổng quát từ GLB và JSON `loadHandModelFromConfig(THREE, config, overrideGlbUrl)`.
- `src/models/configs/` — tệp cấu hình JSON mô tả danh sách node khớp 3D (`robot-hand5.json`, `robot-hand3.json`).
- `src-tauri/` — cấu hình Tauri chuẩn (Cargo.toml, tauri.conf.json, icons).

## Nạp & Điều khiển GLB Model
- `src/models/hand-loader.js` dùng `GLTFLoader` nạp file `.glb` bằng URL runtime (`./assets/${config.name}.glb`, fallback `/assets/...`) — trỏ tới `public/assets/`, không phải `src/assets/`.
- Tự động map node name trong GLB thành `RIG` (`index`, `middle`, `ring`, `pinky`, `thumb`, `thumbMount`/`thumbYaw`) và trích xuất `userData.joints` cho từng ngón tay để thanh trượt trong `index.html` điều khiển góc xoay.
- Giữ nguyên cấu trúc node name khi xuất/đổi file GLB mới để bộ khớp trong UI hoạt động bình thường.

## Sửa UI điều khiển khớp
Nằm trong `<script type="module">` cuối `src/index.html`, trong object `PROFILES` (khoá `five`/`three`) — mỗi profile định nghĩa `fingers` (số khớp + giới hạn góc mỗi ngón), `thumbExtra` (slider phụ ngón cái), `hasWrist`/`wristRanges`, và `poses` (thế tay preset). Hàm `mount(profileKey)` nạp async model + dựng lại panel.

## Offline
App phải chạy không cần Internet sau khi build. Không đổi import map trong `index.html` sang URL CDN — luôn giữ `./vendor/...`.
