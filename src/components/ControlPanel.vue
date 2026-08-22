<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Message from 'primevue/message';
import Fieldset from 'primevue/fieldset';

const { t } = useI18n();

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
    <h1 id="panelTitle">{{ t('currentPose') }}</h1>

    <!-- Status Banner -->
    <Message :severity="statusSeverity" size="small" :icon="statusIcon" class="status-message">
      <template v-if="isPlaying">
        {{ t('statusPlaying') }}
      </template>
      <template v-else-if="selectedWaypointName">
        {{ t('statusEditing', { name: selectedWaypointName }) }}
      </template>
      <template v-else>
        {{ t('statusCreating') }}
      </template>
    </Message>

    <!-- Presets Bar (Rendered 100% directly from JSON config) -->
    <ButtonGroup id="presets">
      <Button
        v-for="(pose, name) in currentProfile.poses"
        :key="name"
        :label="name"
        size="small"
        :disabled="isPlaying"
        :severity="activePreset === name ? 'primary' : 'secondary'"
        class="btn-preset"
        @click="emit('select-preset', name)"
      />
    </ButtonGroup>

    <!-- Controls / Finger Groups -->
    <Message v-if="loading" severity="secondary" size="small" icon="pi pi-spin pi-spinner" class="italic">
      {{ t('loadingModel') }}
    </Message>

    <template v-else>
      <Fieldset v-for="finger in currentProfile.fingers" :key="finger.key" :legend="finger.label">
        <label
          v-for="(jointLabel, index) in finger.joints"
          :key="index"
          class="joint-row"
        >
          <span>{{ typeof jointLabel === 'object' ? jointLabel.label : (finger.jointLabels ? finger.jointLabels[index] : jointLabel) }}</span>
          <Slider
            :model-value="Math.round(state[`${finger.key}.${index}`] || 0)"
            :min="0" :max="1000" :disabled="isPlaying"
            @update:model-value="v => onSliderInput(`${finger.key}.${index}`, v)"
          />
          <output class="text-right tabular-nums text-panel-fg">{{ Math.round(state[`${finger.key}.${index}`] || 0) }}</output>
        </label>
      </Fieldset>
    </template>

    <!-- Hint Footer (Rendered 100% directly from JSON config) -->
    <p id="panelHint" class="panel-hint">
      {{ currentProfile.hint }}
    </p>
  </aside>
</template>
