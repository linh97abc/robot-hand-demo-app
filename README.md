# Robot Hand Rig — 3D Joint Control & Viewer

Ứng dụng web 3D và ứng dụng Desktop (Tauri 2) mô phỏng và điều khiển trực quan các khớp của bàn tay robot 5 ngón (dạng người) và 3 ngón (gripper công nghiệp).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Tính năng chính

- **Mô hình 3D kép**:
  - **Tay 5 ngón**: 14+ khớp điều khiển (Ngón cái, trỏ, giữa, áp út, út) + góc gập/xoay cổ tay.
  - **Tay 3 ngón (Gripper)**: 7 bậc tự do (7 DOFs), bao gồm khớp xoay đế ngón cái và các khớp gập hành trình 0° – 180°.
- **Điều khiển trực quan**: Thanh trượt điều chỉnh góc quay từng khớp theo độ chính xác thời gian thực.
- **Thế tay định sẵn (Presets)**: Nghỉ, Thẳng đứng, Mở, Nắm, Kẹp, Chỉ, Chữ V.
- **Xuất file 3D**: Cho phép xuất mô hình theo thế tay hiện tại ra file `.obj` hoặc `.glb`.
- **Hoạt động Offline 100%**: Tích hợp Three.js r184 local vendored, không phụ thuộc kết nối mạng hay CDN.
- **Cross-Platform App**: Đóng gói ứng dụng Desktop mượt mà, dung lượng nhẹ bằng Tauri 2 (Rust).

---

## 📁 Cấu trúc dự án

```text
hrhand-app/
├── LICENSE                   # Giấy phép nguồn mở MIT
├── README.md                 # Tài liệu hướng dẫn dự án
├── CLAUDE.md                 # Ghi chú cấu trúc dự án
├── package.json              # Cấu hình dự án & dependency CLI
├── assets/                   # File GLB gốc
│   ├── robot-hand5.glb       # Model 3D tay 5 ngón
│   └── robot-hand3.glb       # Model 3D tay 3 ngón
├── src/                      # Frontend web application
│   ├── App.vue               # Layout chính ứng dụng Vue 3
│   ├── components/
│   │   ├── ThreeStage.vue    # Vue component quản lý Three.js viewer & export OBJ/GLB
│   │   └── ControlPanel.vue  # Vue component bảng điều khiển khớp
│   ├── assets/               # Assets cho Webview (robot-hand5.glb, robot-hand3.glb)
│   ├── models/
│   │   ├── robot-hand5-model.js # Loader & Rig tay 5 ngón
│   │   └── robot-hand3-model.js # Loader & Rig tay 3 ngón
│   └── vendor/               # Three.js r184 & các plugin local (offline)
└── src-tauri/                # Đóng gói Desktop App (Tauri 2 + Rust)
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/main.rs
```

---

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống
- **Node.js**: 18.x trở lên
- **Rust**: Stable toolchain (`rustup`) 1.77+
- **Build tools hệ thống (Tauri Prerequisites)**:
  - **Windows**: Visual Studio C++ Build Tools + WebView2
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `librsvg2-dev`

### Chạy ở chế độ Development

```bash
# Cài đặt dependency CLI
npm install

# Chạy ứng dụng Desktop (Dev mode)
npm run dev
```

### Đóng gói ứng dụng (Production Build)

```bash
npm run build
```

Sau khi hoàn tất, file cài đặt (.msi, .exe cho Windows; .dmg cho macOS; .deb, .AppImage cho Linux) sẽ được tạo tại thư mục `src-tauri/target/release/bundle/`.

---

## 🛠️ Tùy biến & Cập nhật mô hình 3D (.glb)

Cả hai mô hình 3D đều được nạp động từ file `.glb` thông qua `GLTFLoader`:
- Tay 5 ngón: `src/assets/robot-hand5.glb`
- Tay 3 ngón: `src/assets/robot-hand3.glb`

Để thay thế hoặc nâng cấp mô hình 3D, hãy đặt file `.glb` mới vào `src/assets/` và giữ nguyên quy tắc đặt tên node chính để ứng dụng tự động phát hiện bộ khớp (rigging):
- **Tay 5 ngón**: `index`, `middle`, `ring`, `pinky`, `thumb`, `thumb_cmc_mount`, `wrist_pivot`, và các khớp `${fingerName}_joint${N}`.
- **Tay 3 ngón**: `index`, `middle`, `thumb`, `thumb_yaw_mount`, `wrist_pivot_inert`, và các khớp `${fingerName}_joint${N}`.

---

## 📄 Giấy phép (License)

Dự án này được phát hành theo giấy phép **[MIT License](LICENSE)**.
