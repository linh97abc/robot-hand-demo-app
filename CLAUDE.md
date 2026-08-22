# Robot Hand Rig — Tauri app

Bàn tay robot (three.js) — 2 model song song nạp từ `.glb` (5 ngón dạng người, 3 ngón dạng gripper), điều khiển khớp qua bảng trượt, đóng gói desktop app bằng Tauri 2.

## Cấu trúc
- `src/main.js` — entry point, mount Vue app vào `#app`.
- `src/App.vue` — layout chính + state khớp (`state`/`target`), state kịch bản chuyển động (`segments`, `isPlaying`), handler nối `MotionSequencePanel`/`ControlPanel`.
- `src/components/ThreeStage.vue` — Three.js viewer (camera, ánh sáng, export OBJ/GLB).
- `src/components/ControlPanel.vue` — slider khớp, preset tư thế, banner trạng thái.
- `src/components/MotionSequencePanel.vue` — danh sách waypoint, kéo-thả, motion/dwell time, playback, xuất/nhập JSON.
- `public/assets/robot-hand{5,3}.glb` — file 3D GLB.
- `src/models/hand-loader.js` — `loadHandModelFromConfig(config, overrideGlbUrl)`: nạp & rig model từ GLB + JSON config.
- `src/models/configs/*.json` — node khớp 3D mỗi hand. `src/models/poses/*.json` — thế tay preset mỗi hand.
- `src/models/profiles.js` — ghép config + poses thành `PROFILES` (khoá theo tên hand); export hàm đọc joint limits/type/mimic dùng chung giữa `App.vue` và `hand-loader.js`.
- `src-tauri/` — cấu hình Tauri chuẩn (Cargo.toml, tauri.conf.json, icons, `capabilities/`).

## Nạp & điều khiển GLB model
- `hand-loader.js` nạp `.glb` qua URL runtime trỏ tới `public/assets/` (không phải `src/assets/`).
- Tự động map node name trong GLB thành `RIG` (`index`/`middle`/`ring`/`pinky`/`thumb`/`thumbMount`/`thumbYaw`), trích `userData.joints` cho slider điều khiển. Giữ nguyên cấu trúc node name khi đổi file GLB để không hỏng UI.
- Sửa UI điều khiển khớp thì sửa `src/models/configs/*.json` + `poses/*.json`, không sửa inline trong HTML/`profiles.js`.

## Kịch bản chuyển động (Motion Sequence)
- Waypoint = snapshot `state` khớp + `duration_ms` + `dwell_ms`. Nội suy nằm trong `getInterpolatedStateAtTime`/`applyStateAtTime` (`App.vue`).
- Khi `isPlaying === true`, mọi thao tác chỉnh sửa phải bị khóa cả ở UI (`:disabled="isPlaying"`) lẫn logic (guard `if (isPlaying.value) return;` đầu handler) vì `tickPlayback` ghi đè state mỗi frame. Thêm thao tác chỉnh sửa waypoint mới thì áp dụng khóa tương tự.

## Xuất/nhập JSON (native dialog qua Tauri)
- Xuất dùng `@tauri-apps/plugin-dialog` (`save()`) + `@tauri-apps/plugin-fs` (`writeTextFile`) — `<a download>`/Blob không hiện dialog trong Tauri webview. Fallback về Blob khi chạy ngoài Tauri (detect `'__TAURI_INTERNALS__' in window`).
- Nhập dùng `<input type="file">` bình thường (đã tự hiện dialog OS ở cả browser lẫn Tauri).
- Dùng command mới của plugin Tauri nào thì phải khai quyền tương ứng trong `src-tauri/capabilities/default.json` (`<plugin>:default` hoặc `<plugin>:allow-<command>`), không sẽ bị chặn runtime dù JS compile được.

## Giao diện (PrimeVue v4)
- Component có hành vi/state phức tạp (slider, input số, dropdown, nút, toast) dùng **PrimeVue v4** (`primevue` + `@primevue/themes` — KHÔNG dùng `@primeuix/themes`, package đó target v5, đã cân nhắc và chọn v4 vì ổn định hơn cho phần mềm thương mại). Layout (flex/grid, `<aside>`, spacing, heading tĩnh) vẫn dùng Tailwind thuần — không viết lại bằng PrimeVue.
- Theme custom định nghĩa trong `src/main.js` qua `definePreset(Aura, {...})`, khớp palette gold/dark hiện có. App luôn ở dark mode: `<html class="app-dark">` (`index.html`) + `darkModeSelector: '.app-dark'` trong `main.js` — **không** set `darkModeSelector: false` (sẽ ép theme về light mode mặc định, không phải dark, làm input/select bị nền trắng sai theme).
- Slider track/handle cần override riêng trong `components.slider` của preset để khớp CSS gốc. Lưu ý: token màu handle ở chế độ tối phải đặt trong `components.slider.colorScheme.dark.handle.content.background`, không phải `components.slider.handle.content.background` (token dark-mode-specific override đè token gốc, đặt sai chỗ sẽ không có tác dụng — xem `main.js`).
- Danh sách waypoint (`MotionSequencePanel.vue`) giữ nguyên toàn bộ logic kéo-thả Pointer Events tự viết — **không** dùng PrimeVue `OrderList` (component này không hỗ trợ kéo-thả bằng chuột ở bất kỳ bản nào, chỉ có 4 nút mũi tên lên/xuống/đầu/cuối). Chỉ input/button bên trong mỗi hàng dùng PrimeVue (`InputText`/`InputNumber`/`Button`).
- Icon nút PrimeVue (`icon="pi pi-..."`) cần package `primeicons` + import `primeicons/primeicons.css` trong `main.js`.

## Offline
App phải chạy không cần Internet sau build — mọi dependency (three, vue, primevue, @tauri-apps/*) là npm package do Vite bundle vào `dist/`. Không dùng CDN/URL tuyệt đối. (`src/debug-model.html` là trang debug ngoài luồng, không tính vào bundle production.)
