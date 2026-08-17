<script setup>
import { ref, reactive, onMounted, shallowRef } from 'vue';
import * as THREE from 'three';
import ThreeStage from './components/ThreeStage.vue';
import ControlPanel from './components/ControlPanel.vue';
import { PROFILES, getJointLimits, getJointAxisVector, getJointType, getJointMimic, DEG } from './models/profiles.js';

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
      // Default rest position is 500 for joints with negative lower limits, 0 otherwise
      const limits = getJointLimits(null, f, i);
      const defaultVal = (limits && limits.lower < 0) ? 500 : 0;
      REST[`${f.key}.${i}`] = defaultVal;
    });
  });

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
    const result = await profile.buildModel();

    activeModel.value = result.model;
    RIG = result.RIG;

    // Reset state & target
    Object.keys(state).forEach((k) => delete state[k]);
    Object.keys(target).forEach((k) => delete target[k]);

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

    // Select default pose from JSON config or pick first available pose
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

onMounted(() => {
  if (defaultProfileKey) {
    loadProfile(defaultProfileKey);
  }
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
        :model-name="PROFILES[currentProfileKey]?.name || currentProfileKey"
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
