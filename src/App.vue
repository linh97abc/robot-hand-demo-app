<script setup>
import { ref, reactive, onMounted, shallowRef } from 'vue';
import * as THREE from 'three';
import ThreeStage from './components/ThreeStage.vue';
import ControlPanel from './components/ControlPanel.vue';
import { loadHandModelFromConfig } from './models/hand-loader.js';
import hand5Config from './models/configs/robot-hand5.json';
import hand3Config from './models/configs/robot-hand3.json';

const DEG = Math.PI / 180;

function createProfile(config) {
  return {
    ...config,
    buildModel: (THREE, url) => loadHandModelFromConfig(THREE, config, url),
    thumbExtra: config.thumbExtra ? {
      ...config.thumbExtra,
      read: (RIG) => {
        const node = RIG[config.thumbExtra.targetKey];
        if (!node) return 0;
        const mult = config.thumbExtra.multiplier || 1;
        return (mult * node.rotation[config.thumbExtra.axis]) / DEG;
      },
      apply: (RIG, wrist, v) => {
        const node = RIG[config.thumbExtra.targetKey];
        if (!node) return;
        const mult = config.thumbExtra.multiplier || 1;
        node.rotation[config.thumbExtra.axis] = mult * v * DEG;
      },
    } : null,
  };
}

const PROFILES = {
  five: createProfile(hand5Config),
  three: createProfile(hand3Config),
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

  if (profile.thumbExtra && profile.thumbExtra.apply) {
    const val = state[profile.thumbExtra.key] ?? 0;
    profile.thumbExtra.apply(RIG, wrist, val);
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
  const profile = PROFILES[currentProfileKey.value];
  // Calculate REST defaults for current profile
  const REST = {};
  profile.fingers.forEach((f) => {
    f.joints.forEach((_, i) => {
      REST[`${f.key}.${i}`] = currentProfileKey.value === 'three' ? 90 : 0;
    });
  });
  if (profile.thumbExtra) {
    REST[profile.thumbExtra.key] = currentProfileKey.value === 'three' ? 0 : 78;
  }
  if (profile.hasWrist) {
    REST['wrist.pitch'] = 0;
    REST['wrist.yaw'] = 0;
  }

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
    const stage = stageRef.value;
    const THREE_INST = stage ? stage.getTHREE() : THREE;
    const result = await profile.buildModel(THREE_INST);

    activeModel.value = result.model;
    RIG = result.RIG;
    wrist = result.wrist;

    // Reset state & target
    Object.keys(state).forEach((k) => delete state[k]);
    Object.keys(target).forEach((k) => delete target[k]);

    // Read initial joint angles
    const isOffset90 = profileKey === 'three';
    profile.fingers.forEach((f) => {
      const fingerRoot = RIG[f.key];
      if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
        fingerRoot.userData.joints.forEach((jointNode, i) => {
          const rx = jointNode ? jointNode.rotation.x / DEG : 0;
          const val = Math.round(isOffset90 ? rx + 90 : rx);
          state[`${f.key}.${i}`] = val;
          target[`${f.key}.${i}`] = val;
        });
      }
    });

    if (profile.thumbExtra && profile.thumbExtra.read) {
      const val = Math.round(profile.thumbExtra.read(RIG));
      state[profile.thumbExtra.key] = val;
      target[profile.thumbExtra.key] = val;
    }

    if (profile.hasWrist) {
      state['wrist.pitch'] = 0;
      target['wrist.pitch'] = 0;
      state['wrist.yaw'] = 0;
      target['wrist.yaw'] = 0;
    }

    // Default to 'Nghỉ' pose if available
    if (profile.poses && profile.poses['Nghỉ']) {
      handlePresetSelect('Nghỉ');
    } else {
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

onMounted(() => {
  loadProfile('five');
});
</script>

<template>
  <div class="flex w-screen h-screen overflow-hidden bg-[#efece6]">
    <!-- 3D Stage Viewport (Left) -->
    <main class="flex-1 h-full relative">
      <ThreeStage
        ref="stageRef"
        :model="activeModel"
        background="#efece6"
        :model-name="currentProfileKey === 'three' ? 'robot-hand3' : 'robot-hand5'"
      />
    </main>

    <!-- Joint Controls & Presets Panel (Right) -->
    <ControlPanel
      :profiles="PROFILES"
      :current-profile-key="currentProfileKey"
      :state="state"
      :active-preset="activePreset"
      :loading="loading"
      @switch-profile="handleProfileSwitch"
      @update-joint="handleJointUpdate"
      @select-preset="handlePresetSelect"
    />
  </div>
</template>
