# Robot Hand Rig — Tauri app

Bàn tay robot (three.js) — 2 model song song nạp từ file `.glb` (5 ngón dạng người, 3 ngón dạng gripper công nghiệp), điều khiển từng khớp qua bảng trượt, chuyển đổi model bằng nút trên panel, đóng gói desktop app bằng Tauri 2.

## Cấu trúc
- `src/main.js` — entry point, mount Vue app vào `#app` (khai báo trong `index.html`).
- `src/App.vue` — layout chính Vue 3 + quản lý trạng thái khớp (`state`/`target`), state kịch bản chuyển động (`segments`, `isPlaying`, ...), và các handler nối giữa `MotionSequencePanel`/`ControlPanel`.
- `src/components/ThreeStage.vue` — Vue component quản lý Three.js viewer (camera, ánh sáng, export OBJ/GLB).
- `src/components/ControlPanel.vue` — bảng điều khiển khớp (slider) & presets tư thế, banner trạng thái (tạo mới/đang sửa/đang phát).
- `src/components/MotionSequencePanel.vue` — panel quản lý kịch bản chuyển động: danh sách waypoint, kéo-thả đổi thứ tự, motion/dwell time, playback (play/pause/stop/loop/seek), xuất/nhập JSON.
- `public/assets/robot-hand5.glb` — file 3D GLB bàn tay 5 ngón.
- `public/assets/robot-hand3.glb` — file 3D GLB bàn tay 3 ngón (gripper).
- `src/models/hand-loader.js` — hàm nạp & rig mô hình 3D tổng quát từ GLB và JSON: `loadHandModelFromConfig(config, overrideGlbUrl)`.
- `src/models/configs/` — tệp cấu hình JSON mô tả danh sách node khớp 3D (`robot-hand5.json`, `robot-hand3.json`).
- `src/models/poses/` — tệp cấu hình JSON các thế tay preset (`robot-hand5-poses.json`, `robot-hand3-poses.json`).
- `src/models/profiles.js` — ghép config + poses thành `PROFILES` (khoá theo tên hand), export các hàm đọc joint limits/type/mimic dùng chung giữa `App.vue` và `hand-loader.js`.
- `src-tauri/` — cấu hình Tauri chuẩn (Cargo.toml, tauri.conf.json, icons, `capabilities/`).

## Nạp & Điều khiển GLB Model
- `src/models/hand-loader.js` dùng `GLTFLoader` nạp file `.glb` bằng URL runtime (`./assets/${config.name}.glb`, fallback `/assets/...`) — trỏ tới `public/assets/`, không phải `src/assets/`.
- Tự động map node name trong GLB thành `RIG` (`index`, `middle`, `ring`, `pinky`, `thumb`, `thumbMount`/`thumbYaw`) và trích xuất `userData.joints` cho từng ngón tay để slider trong `ControlPanel.vue` điều khiển góc xoay.
- Giữ nguyên cấu trúc node name khi xuất/đổi file GLB mới để bộ khớp trong UI hoạt động bình thường.

## Sửa UI điều khiển khớp
`PROFILES` được dựng trong `src/models/profiles.js` từ `src/models/configs/*.json` (số khớp + giới hạn góc mỗi ngón) và `src/models/poses/*.json` (thế tay preset) — không còn nằm inline trong HTML. `App.vue` load profile qua `loadProfile(profileKey)`, còn `ControlPanel.vue` render slider/preset theo `currentProfile.fingers`/`currentProfile.poses` nhận qua prop.

## Kịch bản chuyển động (Motion Sequence)
- Waypoint = snapshot `state` khớp + `duration_ms` (thời gian chuyển động) + `dwell_ms` (thời gian dừng nghỉ). Nội suy giữa các waypoint nằm trong `getInterpolatedStateAtTime`/`applyStateAtTime` (`App.vue`).
- Khi `isPlaying === true` (đang phát qua `tickPlayback`/`requestAnimationFrame`), toàn bộ thao tác chỉnh sửa bị khóa cả ở UI (`:disabled="isPlaying"` trên slider/preset/nút waypoint/input) lẫn ở tầng logic (guard `if (isPlaying.value) return;` đầu các handler liên quan trong `App.vue`) để tránh xung đột với state đang bị `tickPlayback` ghi đè mỗi frame. Thêm thao tác chỉnh sửa mới cho waypoint thì nhớ áp dụng khóa tương tự.
- `ControlPanel.vue` nhận prop `isPlaying` để đổi banner trạng thái (tạo mới/đang sửa/đang phát) và khóa slider/preset.

## Xuất/Nhập file JSON (native dialog qua Tauri)
- Xuất JSON dùng `@tauri-apps/plugin-dialog` (`save()`) để hiện hộp thoại lưu file gốc của OS, rồi ghi bằng `@tauri-apps/plugin-fs` (`writeTextFile`) — xem `handleExportJSON` trong `App.vue`. Dùng `<a download>`/Blob sẽ không hiện hộp thoại trong webview của Tauri (không có UI download như trình duyệt đầy đủ), nên phải qua 2 plugin này.
- Có fallback về cách cũ (Blob + `<a download>`) khi chạy ngoài Tauri (vd. `npm run dev` mở thẳng bằng trình duyệt để test nhanh), detect qua `'__TAURI_INTERNALS__' in window`.
- Nhập JSON vẫn dùng `<input type="file">` bình thường vì input file luôn hiện dialog chọn file gốc của OS ở cả trình duyệt lẫn Tauri webview, không cần plugin.
- Mỗi khi dùng thêm command mới của plugin Tauri (dialog/fs/...), phải khai quyền tương ứng trong `src-tauri/capabilities/default.json` (permission dạng `<plugin>:default` hoặc `<plugin>:allow-<command>`), nếu không lệnh sẽ bị chặn ở runtime dù code JS không báo lỗi biên dịch.

## Offline
App phải chạy không cần Internet sau khi build — mọi dependency (three, vue, @tauri-apps/*) là gói npm, được Vite bundle thẳng vào `dist/` lúc build, Tauri chỉ serve static file từ `frontendDist`. Không dùng CDN/URL tuyệt đối trong code hay `index.html`. (File `src/debug-model.html` là trang debug độc lập ngoài luồng app chính, không tính vào bundle production.)
