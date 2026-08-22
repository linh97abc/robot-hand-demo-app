<script setup>
import { ref, reactive, computed, onMounted, shallowRef } from 'vue';
import * as THREE from 'three';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ThreeStage from './components/ThreeStage.vue';
import MotionSequencePanel from './components/MotionSequencePanel.vue';
import ControlPanel from './components/ControlPanel.vue';
import { PROFILES, getJointLimits, getJointAxisVector, getJointType, getJointMimic, DEG } from './models/profiles.js';
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const toast = useToast();

const defaultProfileKey = Object.keys(PROFILES)[0] || '';
const stageRef = ref(null);
const currentProfileKey = ref(defaultProfileKey);
const loading = ref(false);
const activePreset = ref(null);

const activeModel = shallowRef(null);
let RIG = null;

const state = reactive({});
const target = reactive({});
let animating = false;

// Motion Sequence state
const segments = ref([]);
const selectedWaypointIndex = ref(null);
const isPlaying = ref(false);
const isLooping = ref(false);
const currentTimeMs = ref(0);
let animLastTime = null;
let playbackAnimId = null;

const selectedWaypointName = computed(() => {
  if (selectedWaypointIndex.value !== null && segments.value[selectedWaypointIndex.value]) {
    return segments.value[selectedWaypointIndex.value].name || `WP ${selectedWaypointIndex.value + 1}`;
  }
  return null;
});

const totalTimeMs = computed(() => {
  return segments.value.reduce((acc, seg) => acc + (seg.duration_ms || 0) + (seg.dwell_ms || 0), 0);
});

function applyModelRotations() {
  if (!RIG) return;
  const profile = PROFILES[currentProfileKey.value];
  const nodesUpdatedThisFrame = new Set();

  profile.fingers.forEach((f) => {
    const fingerRoot = RIG[f.key];
    if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
      fingerRoot.userData.joints.forEach((jointNode, i) => {
        const mimic = getJointMimic(jointNode, f, i);
        let permilleVal = state[`${f.key}.${i}`] ?? 0;

        if (mimic && mimic.joint) {
          const targetVal = state[mimic.joint] ?? (state[`${mimic.joint}.0`] ?? 0);
          permilleVal = targetVal * (mimic.multiplier ?? 1.0) + (mimic.offset ?? 0);
        }

        const limits = getJointLimits(jointNode, f, i);
        const actualVal = limits.lower + (permilleVal / 1000) * (limits.upper - limits.lower);
        const axisVec = getJointAxisVector(jointNode, f, i);
        const jType = getJointType(jointNode, f, i);
        const q = new THREE.Quaternion().setFromAxisAngle(axisVec, actualVal * DEG);

        if (!nodesUpdatedThisFrame.has(jointNode)) {
          nodesUpdatedThisFrame.add(jointNode);
          if (jType === 'prismatic') {
            const initialPos = jointNode.userData.initialPosition || jointNode.position.clone();
            if (!jointNode.userData.initialPosition) jointNode.userData.initialPosition = initialPos;
            jointNode.position.copy(initialPos).addScaledVector(axisVec, actualVal);
          } else {
            jointNode.quaternion.copy(q);
          }
        } else {
          if (jType === 'prismatic') {
            jointNode.position.addScaledVector(axisVec, actualVal);
          } else {
            jointNode.quaternion.multiply(q);
          }
        }
      });
    }
  });

  stageRef.value?.requestRender();
}

function animateStep() {
  let moving = false;
  for (const k in state) {
    const d = (target[k] ?? 0) - state[k];
    if (Math.abs(d) > 0.5) {
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
  const profile = PROFILES[currentProfileKey.value];
  const REST = {};
  profile.fingers.forEach((f) => {
    f.joints.forEach((_, i) => {
      const limits = getJointLimits(null, f, i);
      const defaultVal = (limits && limits.lower < 0) ? 500 : 0;
      REST[`${f.key}.${i}`] = defaultVal;
    });
  });

  Object.assign(target, REST, pose);
  
  // If editing selected waypoint, update its state vector
  if (selectedWaypointIndex.value !== null && segments.value[selectedWaypointIndex.value]) {
    Object.assign(segments.value[selectedWaypointIndex.value].waypoint, REST, pose);
  }

  if (!animating) {
    animating = true;
    requestAnimationFrame(animateStep);
  }
}

function handleJointUpdate(key, value) {
  if (isPlaying.value) return;
  animating = false;
  state[key] = value;
  target[key] = value;
  activePreset.value = null;

  // Sync edit to selected waypoint
  if (selectedWaypointIndex.value !== null && segments.value[selectedWaypointIndex.value]) {
    segments.value[selectedWaypointIndex.value].waypoint[key] = value;
  }

  applyModelRotations();
}

function handlePresetSelect(presetName) {
  if (isPlaying.value) return;
  const profile = PROFILES[currentProfileKey.value];
  const pose = profile.poses[presetName];
  if (pose) {
    activePreset.value = presetName;
    goToPose(pose);
  }
}

async function loadProfile(profileKey) {
  const profile = PROFILES[profileKey];
  if (!profile) return;

  loading.value = true;
  currentProfileKey.value = profileKey;

  try {
    const result = await profile.buildModel();

    activeModel.value = result.model;
    RIG = result.RIG;

    // Reset state & target & sequence
    Object.keys(state).forEach((k) => delete state[k]);
    Object.keys(target).forEach((k) => delete target[k]);
    segments.value = [];
    selectedWaypointIndex.value = null;
    currentTimeMs.value = 0;
    isPlaying.value = false;

    // Read initial joint angles from model in 0-1000 permille scale
    profile.fingers.forEach((f) => {
      const fingerRoot = RIG[f.key];
      if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
        fingerRoot.userData.joints.forEach((jointNode, i) => {
          const limits = getJointLimits(jointNode, f, i);
          const rx = jointNode ? jointNode.rotation.x / DEG : 0;
          const actualDeg = rx;
          const span = limits.upper - limits.lower;
          const permilleVal = span > 0
            ? Math.round(Math.max(0, Math.min(1000, ((actualDeg - limits.lower) / span) * 1000)))
            : 0;
          state[`${f.key}.${i}`] = permilleVal;
          target[`${f.key}.${i}`] = permilleVal;
        });
      }
    });

    const initialPoseKey = profile.defaultPose || (profile.poses ? Object.keys(profile.poses)[0] : null);
    if (initialPoseKey && profile.poses && profile.poses[initialPoseKey]) {
      handlePresetSelect(initialPoseKey);
    } else {
      activePreset.value = null;
      applyModelRotations();
    }
  } catch (err) {
    console.error(`Failed to load profile ${profileKey}:`, err);
  } finally {
    loading.value = false;
  }
}

function handleProfileSwitch(profileKey) {
  if (profileKey === currentProfileKey.value) return;
  loadProfile(profileKey);
}

// --- Motion Sequence Logic ---

function handleAddWaypoint() {
  if (isPlaying.value) return;
  const currentSnapshot = { ...state };
  const count = segments.value.length + 1;
  const newSegment = {
    id: 'wp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: `WP ${count}`,
    waypoint: currentSnapshot,
    duration_ms: 800,
    dwell_ms: 0,
  };
  segments.value.push(newSegment);
}

function handleSelectWaypoint(index) {
  if (selectedWaypointIndex.value === index) {
    // Deselect if clicked again
    selectedWaypointIndex.value = null;
    return;
  }
  handlePause();
  selectedWaypointIndex.value = index;
  const seg = segments.value[index];
  if (seg && seg.waypoint) {
    Object.assign(state, seg.waypoint);
    Object.assign(target, seg.waypoint);
    applyModelRotations();
  }
}

function handleDeleteWaypoint(index) {
  if (isPlaying.value) return;
  segments.value.splice(index, 1);
  if (selectedWaypointIndex.value === index) {
    selectedWaypointIndex.value = null;
  } else if (selectedWaypointIndex.value > index) {
    selectedWaypointIndex.value--;
  }
}

function handleUpdateSegment({ index, field, value }) {
  if (isPlaying.value) return;
  if (segments.value[index]) {
    segments.value[index][field] = value;
  }
}

function handleReorderWaypoints({ fromIndex, toIndex }) {
  if (isPlaying.value) return;
  if (fromIndex < 0 || fromIndex >= segments.value.length) return;
  if (toIndex < 0 || toIndex >= segments.value.length) return;

  const item = segments.value.splice(fromIndex, 1)[0];
  segments.value.splice(toIndex, 0, item);

  handleSelectWaypoint(toIndex);
}

function getInterpolatedStateAtTime(tMs) {
  if (segments.value.length === 0) return { ...state };
  if (segments.value.length === 1) return { ...segments.value[0].waypoint };

  let accum = 0;
  let prevWp = segments.value[0].waypoint;

  for (let i = 0; i < segments.value.length; i++) {
    const seg = segments.value[i];
    const dur = seg.duration_ms || 0;
    const dwell = seg.dwell_ms || 0;
    const segTotal = dur + dwell;

    if (tMs <= accum + segTotal || i === segments.value.length - 1) {
      const localT = Math.max(0, tMs - accum);
      if (localT < dur && dur > 0) {
        const ratio = Math.min(1, Math.max(0, localT / dur));
        const res = {};
        for (const k in seg.waypoint) {
          const startVal = prevWp[k] ?? seg.waypoint[k] ?? 0;
          const endVal = seg.waypoint[k] ?? 0;
          res[k] = startVal + ratio * (endVal - startVal);
        }
        return res;
      } else {
        return { ...seg.waypoint };
      }
    }

    accum += segTotal;
    prevWp = seg.waypoint;
  }

  return { ...segments.value[segments.value.length - 1].waypoint };
}

function applyStateAtTime(tMs) {
  const interp = getInterpolatedStateAtTime(tMs);
  Object.assign(state, interp);
  Object.assign(target, interp);
  applyModelRotations();
}

function tickPlayback(timestamp) {
  if (!isPlaying.value) return;

  if (!animLastTime) animLastTime = timestamp;
  const dt = timestamp - animLastTime;
  animLastTime = timestamp;

  currentTimeMs.value += dt;

  if (currentTimeMs.value >= totalTimeMs.value) {
    if (isLooping.value && totalTimeMs.value > 0) {
      currentTimeMs.value = currentTimeMs.value % totalTimeMs.value;
    } else {
      currentTimeMs.value = totalTimeMs.value;
      isPlaying.value = false;
    }
  }

  applyStateAtTime(currentTimeMs.value);

  if (isPlaying.value) {
    playbackAnimId = requestAnimationFrame(tickPlayback);
  }
}

function handlePlay() {
  if (segments.value.length === 0 || totalTimeMs.value <= 0) return;

  selectedWaypointIndex.value = null; // Deselect editing waypoint during preview
  if (currentTimeMs.value >= totalTimeMs.value) {
    currentTimeMs.value = 0;
  }

  isPlaying.value = true;
  animLastTime = performance.now();
  playbackAnimId = requestAnimationFrame(tickPlayback);
}

function handlePause() {
  isPlaying.value = false;
  if (playbackAnimId) cancelAnimationFrame(playbackAnimId);
}

function handleStop() {
  handlePause();
  currentTimeMs.value = 0;
  applyStateAtTime(0);
}

function handleToggleLoop() {
  isLooping.value = !isLooping.value;
}

function handleSeek(timeMs) {
  handlePause();
  currentTimeMs.value = timeMs;
  applyStateAtTime(timeMs);
}

async function handleExportJSON() {
  if (isPlaying.value) return;
  const data = {
    version: 1,
    profile: currentProfileKey.value,
    segments: segments.value.map((s) => ({
      name: s.name,
      waypoint: { ...s.waypoint },
      duration_ms: s.duration_ms,
      dwell_ms: s.dwell_ms,
    })),
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const defaultFileName = `${currentProfileKey.value}_motion_sequence.json`;

  if (isTauri) {
    const filePath = await saveFileDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return; // Người dùng hủy hộp thoại
    await writeTextFile(filePath, jsonStr);
    return;
  }

  // Chạy trong trình duyệt thường (vd. `npm run dev` không qua Tauri): tải file như cũ
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function handleImportError(message) {
  toast.add({ severity: 'error', summary: 'Lỗi nhập JSON', detail: message, life: 4000 });
}

function handleImportJSON(data) {
  if (isPlaying.value) return;
  if (!data || !Array.isArray(data.segments)) {
    handleImportError('File JSON không hợp lệ: Thiếu danh sách segments.');
    return;
  }

  const loadedSegments = data.segments.map((s, i) => ({
    id: 'wp_' + Date.now() + '_' + i,
    name: s.name || `WP ${i + 1}`,
    waypoint: s.waypoint || {},
    duration_ms: typeof s.duration_ms === 'number' ? s.duration_ms : 800,
    dwell_ms: typeof s.dwell_ms === 'number' ? s.dwell_ms : 0,
  }));

  segments.value = loadedSegments;
  selectedWaypointIndex.value = null;
  currentTimeMs.value = 0;

  if (loadedSegments.length > 0) {
    Object.assign(state, loadedSegments[0].waypoint);
    Object.assign(target, loadedSegments[0].waypoint);
    applyModelRotations();
  }
}

onMounted(() => {
  if (defaultProfileKey) {
    loadProfile(defaultProfileKey);
  }
});
</script>

<template>
  <div class="flex w-screen h-screen overflow-hidden bg-[#121315]">
    <!-- 3D Stage Viewport (Left) -->
    <main class="flex-1 min-w-0 min-h-0 h-full relative">
      <ThreeStage
        ref="stageRef"
        :model="activeModel"
        background="#141619"
        :model-name="PROFILES[currentProfileKey]?.name || currentProfileKey"
        :profiles="PROFILES"
        :current-profile-key="currentProfileKey"
        @switch-profile="handleProfileSwitch"
      />
    </main>

    <!-- Motion Sequence Panel (Center/Middle) -->
    <MotionSequencePanel
      :segments="segments"
      :selected-waypoint-index="selectedWaypointIndex"
      :is-playing="isPlaying"
      :is-looping="isLooping"
      :current-time-ms="currentTimeMs"
      :total-time-ms="totalTimeMs"
      @add-waypoint="handleAddWaypoint"
      @select-waypoint="handleSelectWaypoint"
      @delete-waypoint="handleDeleteWaypoint"
      @update-segment="handleUpdateSegment"
      @reorder-waypoints="handleReorderWaypoints"
      @play="handlePlay"
      @pause="handlePause"
      @stop="handleStop"
      @toggle-loop="handleToggleLoop"
      @seek="handleSeek"
      @export-json="handleExportJSON"
      @import-json="handleImportJSON"
      @import-error="handleImportError"
    />

    <!-- Joint Controls & Presets Panel (Right) -->
    <ControlPanel
      :profiles="PROFILES"
      :current-profile-key="currentProfileKey"
      :state="state"
      :active-preset="activePreset"
      :loading="loading"
      :selected-waypoint-name="selectedWaypointName"
      :is-playing="isPlaying"
      @switch-profile="handleProfileSwitch"
      @update-joint="handleJointUpdate"
      @select-preset="handlePresetSelect"
    />

    <Toast position="top-right" />
  </div>
</template>
