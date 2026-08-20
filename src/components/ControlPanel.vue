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
  <aside
    class="w-[340px] flex-none border-l border-[#2a2d32] bg-panel text-panel-fg overflow-y-auto pt-4 px-[18px] pb-5 flex flex-col gap-3.5 box-border font-ui select-none"
  >
    <!-- Header -->
    <div>
      <h1 id="panelTitle" class="text-[14.5px] tracking-[.08em] uppercase m-0 font-bold">TƯ THẾ HIỆN TẠI</h1>
    </div>

    <!-- Status Banner -->
    <div
      class="flex items-center gap-2 py-2 px-2.5 rounded-md text-[11px] leading-[1.35]"
      :class="selectedWaypointName
        ? 'bg-gold/12 border border-gold/60 text-[#fde047]'
        : 'bg-[#22c55e14] border border-dashed border-[#22c55e66] text-[#4ade80]'"
    >
      <template v-if="selectedWaypointName">
        <span class="font-bold text-xs flex-shrink-0">✎</span>
        <span>Đang sửa <strong>{{ selectedWaypointName }}</strong> — bấm lại WP để hoàn tất</span>
      </template>
      <template v-else>
        <span class="font-bold text-xs flex-shrink-0">+</span>
        <span>Đang tạo tư thế mới — bấm <strong>"+ Thêm waypoint"</strong> để lưu</span>
      </template>
    </div>

    <!-- Presets Bar -->
    <div class="flex flex-wrap gap-[5px]" id="presets">
      <button
        v-for="(pose, name) in currentProfile.poses"
        :key="name"
        @click="emit('select-preset', name)"
        class="text-[11px] tracking-[.03em] py-[5px] px-2.5 rounded-full border cursor-pointer"
        :class="activePreset === name
          ? 'bg-gold border-gold text-panel font-bold'
          : 'bg-[#24272b] border-line text-panel-fg hover:bg-[#2f3338] hover:border-[#55595f]'"
      >
        {{ name }}
      </button>
    </div>

    <!-- Controls Container -->
    <div id="controls" class="flex flex-col gap-3">
      <div v-if="loading" class="text-[11.5px] text-muted italic">
        Đang tải mô hình 3D...
      </div>

      <template v-else>
        <!-- Finger Groups -->
        <div v-for="finger in currentProfile.fingers" :key="finger.key" class="flex flex-col gap-1.5">
          <h2 class="text-[11px] tracking-[.1em] uppercase text-gold m-0 mb-px font-bold">{{ finger.label }}</h2>

          <label
            v-for="(jointLabel, index) in finger.joints"
            :key="index"
            class="grid grid-cols-[46px_1fr_38px] items-center gap-2 text-[11px] text-[#b8bcc2]"
          >
            <span>{{ typeof jointLabel === 'object' ? jointLabel.label : (finger.jointLabels ? finger.jointLabels[index]
              : jointLabel) }}</span>
            <input type="range" :min="0" :max="1000" :value="Math.round(state[`${finger.key}.${index}`] || 0)"
              @input="e => onSliderInput(`${finger.key}.${index}`, e.target.value)" />
            <output class="text-right tabular-nums text-panel-fg">{{ Math.round(state[`${finger.key}.${index}`] || 0) }}</output>
          </label>

        </div>
      </template>
    </div>

    <!-- Hint Footer -->
    <p id="panelHint" class="text-[10px] text-dim leading-[1.4] border-t border-[#2c3035] pt-2.5 mt-auto">{{ currentProfile.hint }}</p>
  </aside>
</template>
