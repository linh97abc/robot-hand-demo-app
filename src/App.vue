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
let wrist = null;

const state = reactive({});
const target = reactive({});
let animating = false;

function applyModelRotations() {
  if (!RIG) return;
  const profile = PROFILES[currentProfileKey.value];

  profile.fingers.forEach((f) => {
    const fingerRoot = RIG[f.key];
    if (fingerRoot && fingerRoot.userData && fingerRoot.userData.joints) {
      fingerRoot.userData.joints.forEach((jointNode, i) => {
        const mimic = getJointMimic(jointNode);
        let permilleVal = state[`${f.key}.${i}`] ?? 0;

        if (mimic && mimic.joint) {
          const targetVal = state[mimic.joint] ?? (state[`${mimic.joint}.0`] ?? 0);
          permilleVal = targetVal * (mimic.multiplier ?? 1.0) + (mimic.offset ?? 0);
        }

        const limits = getJointLimits(jointNode, f, i);
        const actualVal = limits.lower + (permilleVal / 1000) * (limits.upper - limits.lower);
        const axisVec = getJointAxisVector(jointNode, f, i);
        const jType = getJointType(jointNode);

        if (jType === 'prismatic') {
          // Linear translation for prismatic joints
          const initialPos = jointNode.userData.initialPosition || jointNode.position.clone();
          if (!jointNode.userData.initialPosition) jointNode.userData.initialPosition = initialPos;
          jointNode.position.copy(initialPos).addScaledVector(axisVec, actualVal);
        } else {
          // Angular rotation for revolute joints
          jointNode.quaternion.setFromAxisAngle(axisVec, actualVal * DEG);
        }
      });
    }
  });

  if (profile.thumbExtra && profile.thumbExtra.apply) {
    const val = state[profile.thumbExtra.key] ?? 0;
    profile.thumbExtra.apply(RIG, wrist, val);
  }

  if (profile.wrist && wrist) {
    if (profile.wrist.pitchRange) {
      const pitchRanges = profile.wrist.pitchRange;
      const pitchPermille = state['wrist.pitch'] ?? 500;
      const pitchDeg = pitchRanges[0] + (pitchPermille / 1000) * (pitchRanges[1] - pitchRanges[0]);
      wrist.rotation.x = pitchDeg * DEG;
    }
    if (profile.wrist.yawRange) {
      const yawRanges = profile.wrist.yawRange;
      const yawPermille = state['wrist.yaw'] ?? 500;
      const yawDeg = yawRanges[0] + (yawPermille / 1000) * (yawRanges[1] - yawRanges[0]);
      wrist.rotation.y = yawDeg * DEG;
    }
  }

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
      REST[`${f.key}.${i}`] = 0;
    });
  });
  if (profile.thumbExtra) {
    REST[profile.thumbExtra.key] = 0;
  }
  if (profile.wrist) {
    if (profile.wrist.pitchRange) REST['wrist.pitch'] = 500;
    if (profile.wrist.yawRange) REST['wrist.yaw'] = 500;
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
    const result = await profile.buildModel();

    activeModel.value = result.model;
    RIG = result.RIG;
    wrist = result.wrist;

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

    if (profile.thumbExtra && profile.thumbExtra.read) {
      const permilleVal = Math.round(profile.thumbExtra.read(RIG));
      state[profile.thumbExtra.key] = permilleVal;
      target[profile.thumbExtra.key] = permilleVal;
    }

    if (profile.wrist) {
      if (profile.wrist.pitchRange) {
        state['wrist.pitch'] = 500;
        target['wrist.pitch'] = 500;
      }
      if (profile.wrist.yawRange) {
        state['wrist.yaw'] = 500;
        target['wrist.yaw'] = 500;
      }
    }

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
