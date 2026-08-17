<script setup>
import { ref, reactive, onMounted, shallowRef } from 'vue';
import * as THREE from 'three';
import ThreeStage from './components/ThreeStage.vue';
import ControlPanel from './components/ControlPanel.vue';
import { loadHandModelFromConfig } from './models/hand-loader.js';
import hand5Config from './models/configs/robot-hand5.json';
import hand3Config from './models/configs/robot-hand3.json';

const DEG = Math.PI / 180;

const PROFILES = {
  five: {
    switchLabel: 'Tay 5 ngón',
    title: 'Bàn tay robot · 5 ngón',
    subtitle: 'Điều khiển từng khớp bằng thanh trượt, hoặc chọn một thế tay có sẵn. Kéo chuột trên khung 3D để quay góc nhìn.',
    hint: 'Góc tính theo độ. MCP = khớp bàn–ngón, PIP = khớp giữa, DIP = khớp đầu ngón. Bản xuất OBJ/GLB giữ đúng thế tay hiện tại.',
    buildModel: (THREE, url) => loadHandModelFromConfig(THREE, hand5Config, url),
    fingers: [
      { key: 'thumb', label: 'Ngón cái', joints: ['MCP', 'IP'], max: [70, 80] },
      { key: 'index', label: 'Ngón trỏ', joints: ['MCP', 'PIP', 'DIP'], max: [90, 100, 80] },
      { key: 'middle', label: 'Ngón giữa', joints: ['MCP', 'PIP', 'DIP'], max: [90, 100, 80] },
      { key: 'ring', label: 'Ngón áp út', joints: ['MCP', 'PIP', 'DIP'], max: [90, 100, 80] },
      { key: 'pinky', label: 'Ngón nhỏ', joints: ['MCP', 'PIP', 'DIP'], max: [90, 100, 80] },
    ],
    thumbExtra: {
      finger: 'thumb', key: 'thumb.spread', label: 'Xoay', min: 25, max: 85,
      read: (RIG) => RIG.thumbMount ? RIG.thumbMount.rotation.z / DEG : 0,
      apply: (RIG, wrist, v) => { if (RIG.thumbMount) RIG.thumbMount.rotation.z = v * DEG; },
    },
    hasWrist: true,
    wristRanges: { pitch: [-35, 35], yaw: [-45, 45] },
    poses: {
      'Nghỉ': {},
      'Mở': { 'index.0': 0, 'index.1': 0, 'index.2': 0, 'middle.0': 0, 'middle.1': 0, 'middle.2': 0,
              'ring.0': 0, 'ring.1': 0, 'ring.2': 0, 'pinky.0': 0, 'pinky.1': 0, 'pinky.2': 0,
              'thumb.0': 0, 'thumb.1': 0, 'thumb.spread': 78 },
      'Nắm': { 'index.0': 82, 'index.1': 95, 'index.2': 68, 'middle.0': 84, 'middle.1': 97, 'middle.2': 70,
               'ring.0': 82, 'ring.1': 95, 'ring.2': 68, 'pinky.0': 80, 'pinky.1': 92, 'pinky.2': 66,
               'thumb.0': 45, 'thumb.1': 58, 'thumb.spread': 38 },
      'Kẹp': { 'index.0': 52, 'index.1': 42, 'index.2': 22, 'middle.0': 78, 'middle.1': 90, 'middle.2': 62,
               'ring.0': 80, 'ring.1': 92, 'ring.2': 64, 'pinky.0': 78, 'pinky.1': 90, 'pinky.2': 62,
               'thumb.0': 38, 'thumb.1': 44, 'thumb.spread': 47 },
      'Chỉ': { 'index.0': 0, 'index.1': 0, 'index.2': 0, 'middle.0': 84, 'middle.1': 97, 'middle.2': 70,
               'ring.0': 82, 'ring.1': 95, 'ring.2': 68, 'pinky.0': 80, 'pinky.1': 92, 'pinky.2': 66,
               'thumb.0': 34, 'thumb.1': 50, 'thumb.spread': 40 },
      'Chữ V': { 'index.0': 0, 'index.1': 0, 'index.2': 0, 'middle.0': 0, 'middle.1': 0, 'middle.2': 0,
                 'ring.0': 82, 'ring.1': 95, 'ring.2': 68, 'pinky.0': 80, 'pinky.1': 92, 'pinky.2': 66,
                 'thumb.0': 40, 'thumb.1': 52, 'thumb.spread': 36 },
    },
  },

  three: {
    switchLabel: 'Tay 3 ngón',
    title: 'Bàn tay robot · 3 ngón (gripper)',
    subtitle: 'Gripper công nghiệp 3 ngón, 7 khớp — mỗi khớp có motor riêng, quay được tối đa 180°. Ngón cái xoay quanh trục đứng để khép sát vào 2 ngón kia.',
    hint: 'Góc tính theo độ, mỗi khớp hành trình 0–180°. Với cả 3 ngón (cái, trỏ, giữa), 90° là vị trí thẳng đứng. MCP/PIP/IP là các khớp có trục nằm ngang; "Xoay đế" là khớp trục đứng ở gốc ngón cái.',
    buildModel: (THREE, url) => loadHandModelFromConfig(THREE, hand3Config, url),
    fingers: [
      { key: 'thumb', label: 'Ngón cái', joints: ['MCP', 'IP'], max: [180, 180] },
      { key: 'index', label: 'Ngón trỏ', joints: ['MCP', 'PIP'], max: [180, 180] },
      { key: 'middle', label: 'Ngón giữa', joints: ['MCP', 'PIP'], max: [180, 180] },
    ],
    thumbExtra: {
      finger: 'thumb', key: 'thumb.yaw', label: 'Xoay đế', min: 0, max: 180,
      read: (RIG) => RIG.thumbYaw ? -RIG.thumbYaw.rotation.y / DEG : 0,
      apply: (RIG, wrist, v) => { if (RIG.thumbYaw) RIG.thumbYaw.rotation.y = -v * DEG; },
    },
    hasWrist: false,
    poses: {
      'Nghỉ': { 'index.0': 110, 'index.1': 112, 'middle.0': 110, 'middle.1': 112, 'thumb.0': 112, 'thumb.1': 115, 'thumb.yaw': 25 },
      'Thẳng đứng': { 'index.0': 90, 'index.1': 90, 'middle.0': 90, 'middle.1': 90, 'thumb.0': 90, 'thumb.1': 90, 'thumb.yaw': 0 },
      'Mở': { 'index.0': 100, 'index.1': 105, 'middle.0': 100, 'middle.1': 105, 'thumb.0': 100, 'thumb.1': 105, 'thumb.yaw': 40 },
      'Nắm': { 'index.0': 160, 'index.1': 180, 'middle.0': 162, 'middle.1': 180, 'thumb.0': 145, 'thumb.1': 160, 'thumb.yaw': 170 },
      'Kẹp': { 'index.0': 130, 'index.1': 140, 'middle.0': 160, 'middle.1': 178, 'thumb.0': 125, 'thumb.1': 132, 'thumb.yaw': 120 },
      'Chỉ': { 'index.0': 90, 'index.1': 90, 'middle.0': 162, 'middle.1': 180, 'thumb.0': 140, 'thumb.1': 154, 'thumb.yaw': 150 },
      'Chữ V': { 'index.0': 90, 'index.1': 90, 'middle.0': 90, 'middle.1': 90, 'thumb.0': 140, 'thumb.1': 154, 'thumb.yaw': 150 },
    },
  },
};

const stageRef = ref(null);
const currentProfileKey = ref('five');
const loading = ref(false);
const activePreset = ref('Nghỉ');

const activeModel = shallowRef(null);
let RIG = null;
let wrist = null;

const state = reactive({});
const target = reactive({});
let REST = {};
let animating = false;

function applyModelRotations() {
  if (!RIG) return;
  const profile = PROFILES[currentProfileKey.value];
  const isOffset90 = currentProfileKey.value === 'three';

  profile.fingers.forEach((f) => {
    const fingerRoot = RIG[f.key];
    if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
      fingerRoot.userData.joints.forEach((jointNode, i) => {
        const val = state[`${f.key}.${i}`] ?? 0;
        jointNode.rotation.x = (isOffset90 ? val - 90 : val) * DEG;
      });
    }
  });

  if (profile.thumbExtra) {
    profile.thumbExtra.apply(RIG, wrist, state[profile.thumbExtra.key] ?? 0);
  }

  if (profile.hasWrist && wrist) {
    wrist.rotation.x = (state['wrist.pitch'] ?? 0) * DEG;
    wrist.rotation.y = (state['wrist.yaw'] ?? 0) * DEG;
  }

  stageRef.value?.requestRender();
}

function animateStep() {
  let moving = false;
  for (const k in state) {
    const d = (target[k] ?? 0) - state[k];
    if (Math.abs(d) > 0.15) {
      state[k] += d * 0.18;
      moving = true;
    } else {
      state[k] = target[k];
    }
  }
  applyModelRotations();
  if (moving) {
    requestAnimationFrame(animateStep);
  } else {
    animating = false;
  }
}

function goToPose(pose) {
  Object.assign(target, REST, pose);
  if (!animating) {
    animating = true;
    requestAnimationFrame(animateStep);
  }
}

function handleJointUpdate(key, value) {
  animating = false;
  state[key] = value;
  target[key] = value;
  activePreset.value = null;
  applyModelRotations();
}

function handlePresetSelect(presetName) {
  activePreset.value = presetName;
  const profile = PROFILES[currentProfileKey.value];
  const pose = profile.poses[presetName] || {};
  goToPose(pose);
}

async function loadProfile(profileKey) {
  loading.value = true;
  currentProfileKey.value = profileKey;
  const profile = PROFILES[profileKey];

  try {
    const built = await profile.buildModel(THREE);
    RIG = built.RIG;
    wrist = built.wrist;

    // Reset state & target
    for (const key in state) delete state[key];
    for (const key in target) delete target[key];

    profile.fingers.forEach((f) => {
      const isOffset90 = profileKey === 'three';
      const fingerRoot = RIG[f.key];
      if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
        fingerRoot.userData.joints.forEach((g, i) => {
          const k = `${f.key}.${i}`;
          const deg = g.rotation.x / DEG;
          state[k] = target[k] = isOffset90 ? deg + 90 : deg;
        });
      }
    });

    if (profile.thumbExtra) {
      const v = profile.thumbExtra.read(RIG);
      state[profile.thumbExtra.key] = target[profile.thumbExtra.key] = v;
    }

    if (profile.hasWrist) {
      state['wrist.pitch'] = target['wrist.pitch'] = 0;
      state['wrist.yaw'] = target['wrist.yaw'] = 0;
    }

    REST = { ...state };
    activeModel.value = built.model;
    activePreset.value = 'Nghỉ';
    applyModelRotations();
  } catch (err) {
    console.error('Error building model:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProfile('five');
});
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#0e1013] font-sans antialiased">
    <!-- Main 3D Viewport Stage -->
    <main class="flex-1 min-w-0 h-full relative">
      <ThreeStage
        ref="stageRef"
        :model="activeModel"
        background="#efece6"
        :model-name="currentProfileKey === 'five' ? 'robot-hand5' : 'robot-hand3'"
      />
    </main>

    <!-- Sidebar Control Panel -->
    <ControlPanel
      :profiles="PROFILES"
      :current-profile-key="currentProfileKey"
      :state="state"
      :active-preset="activePreset"
      :loading="loading"
      @switch-profile="loadProfile"
      @update-joint="handleJointUpdate"
      @select-preset="handlePresetSelect"
    />
  </div>
</template>
