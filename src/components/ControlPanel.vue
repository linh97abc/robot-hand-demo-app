<script setup>
import { computed } from 'vue';
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Fieldset from 'primevue/fieldset';
import ProgressSpinner from 'primevue/progressspinner';

const props = defineProps({
  profiles: { type: Object, required: true },
  currentProfileKey: { type: String, required: true },
  state: { type: Object, required: true },
  activePreset: { type: String, default: null },
  loading: { type: Boolean, default: false },
  selectedWaypointName: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
});

const emit = defineEmits(['switch-profile', 'update-joint', 'select-preset']);

const currentProfile = computed(() => props.profiles[props.currentProfileKey] || {});

const statusSeverity = computed(() => {
  if (props.isPlaying) return 'info';
  if (props.selectedWaypointName) return 'warn';
  return 'success';
});

const statusIcon = computed(() => {
  if (props.isPlaying) return 'pi pi-play';
  if (props.selectedWaypointName) return 'pi pi-pencil';
  return 'pi pi-plus';
});

function onSliderInput(key, value) {
  emit('update-joint', key, value);
}
</script>

<template>
  <aside
    class="w-[340px] flex-none border-l border-[#2a2d32] bg-panel text-panel-fg overflow-y-auto pt-4 px-[18px] pb-5 flex flex-col gap-3.5 box-border font-ui select-none"
  >
    <!-- Header -->
    <div>
      <h1 id="panelTitle">CURRENT POSE</h1>
    </div>

    <!-- Status Banner (Single persistent element, instant content swap, zero layout shift) -->
    <Message :severity="statusSeverity" size="small" :icon="statusIcon" class="min-h-[38px] transition-colors duration-150">
      <template v-if="isPlaying">
        Playing motion sequence — stop playback to edit
      </template>
      <template v-else-if="selectedWaypointName">
        Editing <strong>{{ selectedWaypointName }}</strong> — click WP again to complete
      </template>
      <template v-else>
        Creating new pose — click <strong>"+ Add Waypoint"</strong> to save
      </template>
    </Message>

    <!-- Presets Bar -->
    <div class="flex flex-wrap gap-[5px]" id="presets">
      <Button
        v-for="(pose, name) in currentProfile.poses"
        :key="name"
        :label="name"
        size="small"
        :disabled="isPlaying"
        :severity="activePreset === name ? 'primary' : 'secondary'"
        class="!rounded-full !text-[11px]"
        @click="emit('select-preset', name)"
      />
    </div>

    <!-- Controls Container -->
    <div id="controls" class="flex flex-col gap-3">
      <div v-if="loading" class="flex items-center gap-2 text-[11.5px] text-muted italic">
        <ProgressSpinner style="width: 14px; height: 14px" stroke-width="6" />
        <span>Loading 3D model...</span>
      </div>

      <template v-else>
        <!-- Finger Groups -->
        <Fieldset v-for="finger in currentProfile.fingers" :key="finger.key" :legend="finger.label">
          <label
            v-for="(jointLabel, index) in finger.joints"
            :key="index"
            class="joint-row"
          >
            <span>{{ typeof jointLabel === 'object' ? jointLabel.label : (finger.jointLabels ? finger.jointLabels[index]
              : jointLabel) }}</span>
            <Slider
              :model-value="Math.round(state[`${finger.key}.${index}`] || 0)"
              :min="0" :max="1000" :disabled="isPlaying"
              @update:model-value="v => onSliderInput(`${finger.key}.${index}`, v)"
            />
            <output class="text-right tabular-nums text-panel-fg">{{ Math.round(state[`${finger.key}.${index}`] || 0) }}</output>
          </label>
        </Fieldset>
      </template>
    </div>

    <!-- Hint Footer -->
    <p id="panelHint" class="panel-hint">{{ currentProfile.hint }}</p>
  </aside>
</template>
