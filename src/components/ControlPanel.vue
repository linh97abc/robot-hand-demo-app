<script setup>
import { computed } from 'vue';

const props = defineProps({
  profiles: { type: Object, required: true },
  currentProfileKey: { type: String, required: true },
  state: { type: Object, required: true },
  activePreset: { type: String, default: null },
  loading: { type: Boolean, default: false },
  selectedWaypointName: { type: String, default: null },
});

const emit = defineEmits(['switch-profile', 'update-joint', 'select-preset']);

const currentProfile = computed(() => props.profiles[props.currentProfileKey] || {});

function onSliderInput(key, value) {
  emit('update-joint', key, parseFloat(value));
}
</script>

<template>
  <aside class="panel">
    <!-- Header -->
    <div>
      <h1 id="panelTitle">TƯ THẾ HIỆN TẠI</h1>
    </div>

    <!-- Status Banner -->
    <div class="status-banner" :class="{ 'editing-mode': !!selectedWaypointName }">
      <template v-if="selectedWaypointName">
        <span class="status-icon">✎</span>
        <span>Đang sửa <strong>{{ selectedWaypointName }}</strong> — bấm lại WP để hoàn tất</span>
      </template>
      <template v-else>
        <span class="status-icon">+</span>
        <span>Đang tạo tư thế mới — bấm <strong>"+ Thêm waypoint"</strong> để lưu</span>
      </template>
    </div>

    <!-- Presets Bar -->
    <div class="presets" id="presets">
      <button v-for="(pose, name) in currentProfile.poses" :key="name" @click="emit('select-preset', name)"
        :class="{ on: activePreset === name }">
        {{ name }}
      </button>
    </div>

    <!-- Controls Container -->
    <div id="controls" class="controls-container">
      <div v-if="loading" style="font-size:11.5px; color:#9a9ea4; font-style:italic">
        Đang tải mô hình 3D...
      </div>

      <template v-else>
        <!-- Finger Groups -->
        <div v-for="finger in currentProfile.fingers" :key="finger.key" class="group">
          <h2>{{ finger.label }}</h2>

          <label v-for="(jointLabel, index) in finger.joints" :key="index" class="row">
            <span>{{ typeof jointLabel === 'object' ? jointLabel.label : (finger.jointLabels ? finger.jointLabels[index]
              : jointLabel) }}</span>
            <input type="range" :min="0" :max="1000" :value="Math.round(state[`${finger.key}.${index}`] || 0)"
              @input="e => onSliderInput(`${finger.key}.${index}`, e.target.value)" />
            <output>{{ Math.round(state[`${finger.key}.${index}`] || 0) }}</output>
          </label>

        </div>
      </template>
    </div>

    <!-- Hint Footer -->
    <p class="hint" id="panelHint">{{ currentProfile.hint }}</p>
  </aside>
</template>

<style scoped>
.panel {
  width: 340px;
  flex: none;
  flex-shrink: 0;
  border-left: 1px solid #2a2d32;
  background: #1c1e21;
  color: #e9e7e2;
  overflow-y: auto;
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
  font-family: Helvetica, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
}

.panel h1 {
  font-size: 14.5px;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin: 0;
  font-weight: 700;
}

.panel .sub {
  font-size: 11px;
  line-height: 1.4;
  color: #9a9ea4;
  margin: 4px 0 0;
}

.model-select-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.model-select-label {
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #c9a35c;
  font-weight: 700;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: #24272b;
  color: #e9e7e2;
  border: 1px solid #3a3e44;
  border-radius: 6px;
  padding: 8px 30px 8px 12px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.select-wrapper select:hover {
  background: #2f3338;
  border-color: #55595f;
}

.select-wrapper select:focus {
  border-color: #c9a35c;
}

.select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #c9a35c;
  font-size: 11px;
  pointer-events: none;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.presets button {
  font: inherit;
  font-size: 11px;
  letter-spacing: .03em;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #3a3e44;
  background: #24272b;
  color: #e9e7e2;
  cursor: pointer;
}

.presets button:hover {
  background: #2f3338;
  border-color: #55595f;
}

.presets button.on {
  background: #c9a35c;
  border-color: #c9a35c;
  color: #1c1e21;
  font-weight: 700;
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group>h2 {
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #c9a35c;
  margin: 0 0 1px;
  font-weight: 700;
}

.row {
  display: grid;
  grid-template-columns: 46px 1fr 38px;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #b8bcc2;
}

.row output {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #e9e7e2;
}

.hint {
  font-size: 10px;
  color: #71767c;
  line-height: 1.4;
  border-top: 1px solid #2c3035;
  padding-top: 10px;
  margin-top: auto;
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px dashed rgba(34, 197, 94, 0.4);
  color: #4ade80;
  line-height: 1.35;
}

.status-banner.editing-mode {
  background: rgba(201, 163, 92, 0.12);
  border: 1px solid rgba(201, 163, 92, 0.6);
  color: #fde047;
}

.status-icon {
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
}
</style>
