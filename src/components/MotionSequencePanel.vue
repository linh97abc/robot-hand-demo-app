<script setup>
import { ref, computed, reactive } from 'vue';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Slider from 'primevue/slider';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import { currentLang, t } from '../i18n/index.js';

const props = defineProps({
  segments: { type: Array, required: true },
  selectedWaypointIndex: { type: Number, default: null },
  isPlaying: { type: Boolean, default: false },
  isLooping: { type: Boolean, default: false },
  currentTimeMs: { type: Number, default: 0 },
  totalTimeMs: { type: Number, default: 0 },
});

const emit = defineEmits([
  'add-waypoint',
  'select-waypoint',
  'delete-waypoint',
  'update-segment',
  'reorder-waypoints',
  'play',
  'pause',
  'stop',
  'toggle-loop',
  'seek',
  'export-json',
  'import-json',
  'import-error',
]);

const fileInputRef = ref(null);

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      emit('import-json', data);
    } catch (err) {
      emit('import-error', 'Invalid JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function triggerImport() {
  if (props.isPlaying) return;
  fileInputRef.value?.click();
}

function onNameChange(index, value) {
  emit('update-segment', { index, field: 'name', value });
}

function onDurationChange(index, value) {
  const val = Math.max(0, parseInt(value, 10) || 0);
  emit('update-segment', { index, field: 'duration_ms', value: val });
}

function onDwellChange(index, value) {
  const val = Math.max(0, parseInt(value, 10) || 0);
  emit('update-segment', { index, field: 'dwell_ms', value: val });
}

const draggingIndex = ref(null);
const dropTargetIndex = ref(null);
const isPointerDragging = ref(false);
const dragPosition = reactive({ x: 0, y: 0 });

const displaySegments = computed(() => {
  if (!isPointerDragging.value || draggingIndex.value === null || dropTargetIndex.value === null) {
    return props.segments.map((seg, origIdx) => ({
      ...seg,
      origIndex: origIdx,
      isPlaceholder: false,
    }));
  }

  const list = props.segments.map((seg, origIdx) => ({
    ...seg,
    origIndex: origIdx,
    isPlaceholder: false,
  }));

  const [draggedItem] = list.splice(draggingIndex.value, 1);
  const placeholderItem = {
    ...draggedItem,
    id: 'placeholder_' + (draggedItem.id || draggingIndex.value),
    isPlaceholder: true,
  };

  const target = Math.max(0, Math.min(list.length, dropTargetIndex.value));
  list.splice(target, 0, placeholderItem);

  return list;
});

const activeWaypointIndex = computed(() => {
  if (!props.isPlaying || props.segments.length === 0) return null;

  let accum = 0;
  const tMs = props.currentTimeMs;

  for (let i = 0; i < props.segments.length; i++) {
    const seg = props.segments[i];
    const segTotal = (seg.duration_ms || 0) + (seg.dwell_ms || 0);
    if (tMs <= accum + segTotal || i === props.segments.length - 1) {
      return i;
    }
    accum += segTotal;
  }

  return props.segments.length - 1;
});

let initialMidpointsInContainer = [];
let initialContainerTop = 0;

function startPointerDrag(index, event) {
  if (props.isPlaying) return;
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const listEl = document.querySelector('.segments-list');
  if (listEl) {
    const listRect = listEl.getBoundingClientRect();
    initialContainerTop = listRect.top - listEl.scrollTop;

    const rowElements = Array.from(listEl.querySelectorAll('.segment-row'));
    initialMidpointsInContainer = rowElements.map((rowEl) => {
      const rBox = rowEl.getBoundingClientRect();
      return (rBox.top + rBox.height / 2) - initialContainerTop;
    });
  }

  draggingIndex.value = index;
  dropTargetIndex.value = index;
  isPointerDragging.value = true;
  dragPosition.x = event.clientX;
  dragPosition.y = event.clientY;

  document.body.classList.add('is-dragging-waypoint');
  document.body.classList.remove('is-outside-drop-zone');

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(event) {
  if (!isPointerDragging.value || draggingIndex.value === null) return;

  dragPosition.x = event.clientX;
  dragPosition.y = event.clientY;

  const listEl = document.querySelector('.segments-list');
  if (!listEl) return;

  const rect = listEl.getBoundingClientRect();
  const isInsideDropZone = (
    event.clientX >= rect.left - 60 &&
    event.clientX <= rect.right + 60 &&
    event.clientY >= rect.top - 40 &&
    event.clientY <= rect.bottom + 40
  );

  if (isInsideDropZone) {
    document.body.classList.remove('is-outside-drop-zone');

    if (initialMidpointsInContainer.length === 0) {
      dropTargetIndex.value = 0;
      return;
    }

    const currentYInContainer = event.clientY - rect.top + listEl.scrollTop;

    let closestIdx = 0;
    let minDistance = Infinity;

    initialMidpointsInContainer.forEach((midY, idx) => {
      const dist = Math.abs(currentYInContainer - midY);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    dropTargetIndex.value = closestIdx;
  } else {
    dropTargetIndex.value = null;
    document.body.classList.add('is-outside-drop-zone');
  }
}

function onPointerUp() {
  if (isPointerDragging.value && draggingIndex.value !== null && dropTargetIndex.value !== null) {
    if (draggingIndex.value !== dropTargetIndex.value) {
      emit('reorder-waypoints', {
        fromIndex: draggingIndex.value,
        toIndex: dropTargetIndex.value,
      });
    }
  }

  draggingIndex.value = null;
  dropTargetIndex.value = null;
  isPointerDragging.value = false;

  document.body.classList.remove('is-dragging-waypoint', 'is-outside-drop-zone');

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
}
</script>

<template>
  <aside
    class="w-[360px] flex-none bg-panel text-panel-fg border-r border-[#2a2d32] flex flex-col pt-4 px-3.5 pb-5 gap-3.5 box-border font-ui select-none overflow-y-auto overflow-x-hidden"
  >
    <!-- Header -->
    <div>
      <h1>{{ t('motionSequence') }}</h1>
      <p class="mb-3">
        {{ t('motionSeqDesc') }}
      </p>

      <ButtonGroup class="flex gap-2">
        <Button :label="t('exportJson')" severity="secondary" size="small" :disabled="isPlaying" @click="emit('export-json')" />
        <Button :label="t('importJson')" severity="secondary" size="small" :disabled="isPlaying" @click="triggerImport" />
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          :disabled="isPlaying"
          @change="handleFileChange"
        />
      </ButtonGroup>
    </div>

    <!-- Timeline Scrub section -->
    <div class="flex flex-col gap-1.5">
      <p class="timeline-label">
        <span>{{ Math.round(currentTimeMs) }} ms / {{ Math.round(totalTimeMs) }} ms</span>
      </p>
      <Slider
        :model-value="currentTimeMs"
        :min="0" :max="totalTimeMs || 100"
        @update:model-value="v => emit('seek', v)"
      />
    </div>

    <!-- Controls toolbar -->
    <ButtonGroup class="flex gap-1 items-center flex-nowrap w-full justify-between">
      <Button :label="t('addWaypoint')" severity="primary" size="small" :disabled="isPlaying" @click="emit('add-waypoint')" />

      <Button v-if="!isPlaying" :label="t('play')" severity="success" size="small" @click="emit('play')" />
      <Button v-else :label="t('pause')" severity="warn" size="small" class="animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]" @click="emit('pause')" />

      <Button :label="t('stop')" :disabled="!isPlaying" severity="danger" size="small" :class="isPlaying ? 'animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' : ''" @click="emit('stop')" />

      <Button :label="t('loop')" :severity="isLooping ? 'primary' : 'secondary'" size="small" @click="emit('toggle-loop')" />
    </ButtonGroup>

    <!-- Segments Table / List Header -->
    <header class="segment-grid table-header">
      <span>{{ t('colWaypoint') }}</span>
      <span class="text-center">{{ t('colDuration') }}</span>
      <span class="text-center">{{ t('colDwell') }}</span>
      <span></span>
    </header>

    <!-- Segments List -->
    <Message v-if="segments.length === 0" severity="secondary" size="small" icon="pi pi-info-circle" class="justify-center my-4">
      {{ t('noWaypoints') }}
    </Message>

    <TransitionGroup v-else name="flip-list" tag="div" class="segments-list flex flex-col gap-1.5 flex-1 min-h-[100px] overflow-y-auto overflow-x-hidden">
      <div
        v-for="item in displaySegments"
        :key="item.id || item.origIndex"
        :data-index="item.origIndex"
        :class="item.isPlaceholder
          ? 'drag-placeholder'
          : ['segment-row', 'segment-grid', {
              playing: activeWaypointIndex === item.origIndex,
              selected: selectedWaypointIndex === item.origIndex
            }]"
        @click="!item.isPlaceholder && emit('select-waypoint', item.origIndex)"
      >
        <template v-if="item.isPlaceholder">
          <div class="drag-slot-hint">
            <span class="arrow-bounce">↓</span>
            <span>Drop here (insert {{ item.name || `WP ${item.origIndex + 1}` }})</span>
          </div>
        </template>

        <template v-else>
          <!-- Reorder Handle & Waypoint Name Textbox -->
          <div class="flex items-center gap-1 min-w-0 pr-1">
            <span
              class="drag-handle"
              :class="{ disabled: isPlaying }"
              title="Drag to reorder"
              @pointerdown="e => startPointerDrag(item.origIndex, e)"
            >⋮⋮</span>
            <InputText
              size="small"
              :disabled="isPlaying"
              class="input-waypoint-name"
              :class="{ '!text-gold': selectedWaypointIndex === item.origIndex }"
              :model-value="item.name"
              :placeholder="`WP ${item.origIndex + 1}`"
              title="Click to edit Waypoint name"
              @click.stop
              @update:model-value="v => onNameChange(item.origIndex, v)"
            />
          </div>

          <!-- Duration input -->
          <div class="flex justify-center">
            <InputNumber
              size="small"
              :disabled="isPlaying"
              :min="0"
              :step="100"
              :format="false"
              class="input-compact-number"
              :model-value="item.duration_ms"
              @click.stop
              @update:model-value="v => onDurationChange(item.origIndex, v)"
            />
          </div>

          <!-- Dwell input -->
          <div class="flex justify-center">
            <InputNumber
              size="small"
              :disabled="isPlaying"
              :min="0"
              :step="100"
              :format="false"
              class="input-compact-number"
              :model-value="item.dwell_ms"
              @click.stop
              @update:model-value="v => onDwellChange(item.origIndex, v)"
            />
          </div>

          <!-- Row actions: Delete -->
          <div class="flex items-center justify-end gap-[3px]">
            <Button
              icon="pi pi-trash" text size="small" class="btn-trash !w-6 !h-6 !p-0" :disabled="isPlaying"
              @click.stop="emit('delete-waypoint', item.origIndex)"
              title="Delete waypoint"
            />
          </div>
        </template>
      </div>
    </TransitionGroup>

    <!-- Footer JSON Spec Hint -->
    <p class="panel-hint">
      {{ t('jsonHint') }}
    </p>

    <!-- Floating Drag Preview Avatar following mouse -->
    <Teleport to="body">
      <div
        v-if="isPointerDragging && draggingIndex !== null && segments[draggingIndex]"
        class="drag-avatar"
        :style="{
          left: dragPosition.x + 'px',
          top: dragPosition.y + 'px',
        }"
      >
        <span class="text-gold font-bold">⋮⋮</span>
        <span>{{ segments[draggingIndex].name || `WP ${draggingIndex + 1}` }}</span>
        <span class="avatar-duration">{{ segments[draggingIndex].duration_ms }} ms</span>
      </div>
    </Teleport>
  </aside>
</template>

<style>
.flip-list-move {
  transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1);
}

body.is-dragging-waypoint,
body.is-dragging-waypoint * {
  cursor: grabbing !important;
  user-select: none !important;
}

body.is-dragging-waypoint.is-outside-drop-zone,
body.is-dragging-waypoint.is-outside-drop-zone * {
  cursor: not-allowed !important;
}
</style>
