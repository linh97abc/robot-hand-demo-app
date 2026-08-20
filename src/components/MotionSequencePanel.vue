<script setup>
import { ref, computed, reactive } from 'vue';

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
      alert('File JSON không hợp lệ: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function triggerImport() {
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

let initialMidpointsInContainer = [];
let initialContainerTop = 0;

function startPointerDrag(index, event) {
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
  <aside class="script-panel">
    <!-- Header -->
    <div class="header-section">
      <h1>KỊCH BẢN CHUYỂN ĐỘNG</h1>
      <p class="desc">
        Ghi lại tư thế hiện tại thành các waypoint. Bấm vào 1 waypoint để chọn — chỉnh sửa tư thế bằng các thanh trượt ở cột bên phải. Xuất/nhập file JSON để dùng lại.
      </p>
      
      <div class="json-actions">
        <button type="button" class="btn-secondary" @click="emit('export-json')">
          Xuất JSON
        </button>
        <button type="button" class="btn-secondary" @click="triggerImport">
          Nhập JSON
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileChange"
        />
      </div>
    </div>

    <!-- Timeline Scrub section -->
    <div class="timeline-section">
      <div class="time-readout">
        <span>{{ Math.round(currentTimeMs) }} ms / {{ Math.round(totalTimeMs) }} ms</span>
      </div>
      <input
        type="range"
        min="0"
        :max="totalTimeMs || 100"
        :value="currentTimeMs"
        @input="e => emit('seek', parseFloat(e.target.value))"
        class="scrub-slider"
      />
    </div>

    <!-- Controls toolbar -->
    <div class="toolbar">
      <button
        type="button"
        class="btn-primary btn-add"
        @click="emit('add-waypoint')"
      >
        + Thêm waypoint
      </button>

      <button
        v-if="!isPlaying"
        type="button"
        class="btn-action"
        @click="emit('play')"
      >
        ► Phát
      </button>
      <button
        v-else
        type="button"
        class="btn-action btn-active"
        @click="emit('pause')"
      >
        ⏸ Tạm dừng
      </button>

      <button
        type="button"
        class="btn-action"
        @click="emit('stop')"
      >
        ■ Dừng
      </button>

      <button
        type="button"
        class="btn-action"
        :class="{ active: isLooping }"
        @click="emit('toggle-loop')"
      >
        ↻ Lặp
      </button>
    </div>

    <!-- Segments Table / List Header -->
    <div class="table-header">
      <span class="col-name">WAYPOINT</span>
      <span class="col-dur">CHUYỂN ĐỘNG (ms)</span>
      <span class="col-dwell">DỪNG (ms)</span>
      <span class="col-action"></span>
    </div>

    <!-- Segments List -->
    <div v-if="segments.length === 0" class="segments-list">
      <div class="empty-state">
        Chưa có waypoint nào. Bấm "+ Thêm waypoint" để bắt đầu tạo kịch bản.
      </div>
    </div>

    <TransitionGroup v-else name="flip-list" tag="div" class="segments-list">
      <div
        v-for="item in displaySegments"
        :key="item.id || item.origIndex"
        class="segment-row"
        :data-index="item.origIndex"
        :class="{
          selected: selectedWaypointIndex === item.origIndex,
          placeholder: item.isPlaceholder,
        }"
        @click="!item.isPlaceholder && emit('select-waypoint', item.origIndex)"
      >
        <template v-if="item.isPlaceholder">
          <div class="placeholder-content">
            <span class="placeholder-icon">↓</span>
            <span>Thả vào đây (chèn {{ item.name || `WP ${item.origIndex + 1}` }})</span>
          </div>
        </template>

        <template v-else>
          <!-- Reorder Handle & Waypoint Name Textbox -->
          <div class="wp-title-cell">
            <span
              class="drag-handle"
              title="Nhấn giữ và kéo thả để đổi thứ tự"
              @pointerdown="e => startPointerDrag(item.origIndex, e)"
            >⋮⋮</span>
            <input
              type="text"
              class="input-wp-name"
              :value="item.name"
              :placeholder="`WP ${item.origIndex + 1}`"
              title="Nhấp vào để chỉnh sửa tên Waypoint"
              @click.stop
              @input="e => onNameChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Duration input -->
          <div class="input-cell">
            <input
              type="number"
              min="0"
              step="100"
              :value="item.duration_ms"
              @click.stop
              @input="e => onDurationChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Dwell input -->
          <div class="input-cell">
            <input
              type="number"
              min="0"
              step="100"
              :value="item.dwell_ms"
              @click.stop
              @input="e => onDwellChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Row actions: Delete -->
          <div class="action-cell">
            <button
              type="button"
              class="btn-del"
              @click.stop="emit('delete-waypoint', item.origIndex)"
              title="Xóa waypoint"
            >
              ✕
            </button>
          </div>
        </template>
      </div>
    </TransitionGroup>

    <!-- Footer JSON Spec Hint -->
    <div class="script-footer">
      Định dạng file: {"segments": [ {"waypoint": {"thumb.0": 10, ...}, "duration_ms": 800, "dwell_ms": 0}, ... ]}. duration_ms là thời gian chuyển động, dwell_ms là thời gian dừng nghỉ tại waypoint đó.
    </div>

    <!-- Floating Drag Preview Avatar following mouse -->
    <Teleport to="body">
      <div
        v-if="isPointerDragging && draggingIndex !== null && segments[draggingIndex]"
        class="drag-floating-avatar"
        :style="{
          left: dragPosition.x + 'px',
          top: dragPosition.y + 'px',
        }"
      >
        <span class="avatar-handle">⋮⋮</span>
        <span class="avatar-title">{{ segments[draggingIndex].name || `WP ${draggingIndex + 1}` }}</span>
        <span class="avatar-dur">{{ segments[draggingIndex].duration_ms }} ms</span>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.script-panel {
  width: 360px;
  flex: none;
  flex-shrink: 0;
  background: #1c1e21;
  color: #e9e7e2;
  border-right: 1px solid #2a2d32;
  display: flex;
  flex-direction: column;
  padding: 16px 14px 20px;
  gap: 14px;
  box-sizing: border-box;
  font-family: Helvetica, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.header-section h1 {
  font-size: 14.5px;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin: 0 0 6px 0;
  font-weight: 700;
  color: #e9e7e2;
}

.header-section .desc {
  font-size: 11px;
  line-height: 1.45;
  color: #9a9ea4;
  margin: 0 0 12px 0;
}

.json-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  appearance: none;
  background: #282b30;
  border: 1px solid #3a3e44;
  color: #e9e7e2;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn-secondary:hover {
  background: #32363c;
  border-color: #55595f;
}

.hidden {
  display: none;
}

.timeline-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-readout {
  font-size: 10.5px;
  color: #9a9ea4;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.scrub-slider {
  width: 100%;
  accent-color: #c9a35c;
  cursor: pointer;
}

.toolbar {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.btn-primary {
  appearance: none;
  background: #282b30;
  border: 1px solid #484c54;
  color: #e9e7e2;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn-primary:hover {
  background: #343840;
  border-color: #c9a35c;
}

.btn-action {
  appearance: none;
  background: #24272b;
  border: 1px solid #3a3e44;
  color: #e9e7e2;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-action:hover {
  background: #2f3338;
}

.btn-action.active, .btn-action.btn-active {
  background: #c9a35c;
  border-color: #c9a35c;
  color: #1c1e21;
}

.table-header {
  display: grid;
  grid-template-columns: 84px 114px 74px 1fr;
  align-items: center;
  font-size: 8.5px;
  letter-spacing: .01em;
  color: #71767c;
  font-weight: 700;
  padding-bottom: 4px;
  border-bottom: 1px solid #2a2d32;
  margin-top: 4px;
  white-space: nowrap;
}

.col-dur, .col-dwell {
  text-align: center;
  white-space: nowrap;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty-state {
  font-size: 11px;
  color: #71767c;
  font-style: italic;
  padding: 16px 0;
  text-align: center;
}

.segment-row {
  display: grid;
  grid-template-columns: 84px 114px 74px 1fr;
  align-items: center;
  background: #23262a;
  border: 1px solid #32363b;
  border-radius: 6px;
  padding: 5px 6px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.segment-row:hover {
  border-color: #484c54;
  background: #272a2e;
}

.segment-row.selected {
  border-color: #c9a35c;
  background: #2a2d32;
  box-shadow: 0 0 8px rgba(201, 163, 92, 0.2);
}

.flip-list-move {
  transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.segment-row.placeholder {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  justify-content: center;
  background: rgba(201, 163, 92, 0.12) !important;
  border: 1.5px dashed #c9a35c !important;
  box-shadow: inset 0 0 12px rgba(201, 163, 92, 0.2);
  height: 38px;
  padding: 0 8px;
  pointer-events: none;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.placeholder-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #c9a35c;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  width: 100%;
}

.placeholder-icon {
  font-size: 12px;
  font-weight: bold;
  animation: bounce-slot 0.7s infinite alternate;
}

@keyframes bounce-slot {
  from { transform: translateY(-1.5px); }
  to { transform: translateY(2px); }
}

.wp-title-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.drag-handle {
  color: #71767c;
  cursor: grab;
  font-size: 11px;
  user-select: none;
  touch-action: none;
  padding: 4px 2px;
}

.drag-handle:active,
.segment-row.dragging .drag-handle {
  cursor: grabbing;
  color: #c9a35c;
}

.input-wp-name {
  width: 58px;
  background: #191b1d;
  border: 1px solid #373b42;
  color: #e9e7e2;
  border-radius: 4px;
  padding: 3px 5px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
}

.input-wp-name:focus {
  border-color: #c9a35c;
  background: #23262b;
}

.segment-row.selected .input-wp-name {
  color: #c9a35c;
}

.input-cell {
  display: flex;
  justify-content: center;
}

.input-cell input {
  width: 56px;
  background: #191b1d;
  border: 1px solid #373b42;
  color: #e9e7e2;
  border-radius: 4px;
  padding: 3px 4px;
  font-size: 11px;
  text-align: center;
  font-family: inherit;
  outline: none;
}

.input-cell input:focus {
  border-color: #c9a35c;
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}



.btn-del {
  appearance: none;
  background: transparent;
  border: none;
  color: #71767c;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  line-height: 1;
}

.btn-del:hover {
  color: #ef4444;
}

.script-footer {
  font-size: 10px;
  color: #71767c;
  line-height: 1.4;
  border-top: 1px solid #2c3035;
  padding-top: 10px;
  margin-top: auto;
}
</style>

<style>
body.is-dragging-waypoint,
body.is-dragging-waypoint * {
  cursor: grabbing !important;
  user-select: none !important;
}

body.is-dragging-waypoint.is-outside-drop-zone,
body.is-dragging-waypoint.is-outside-drop-zone * {
  cursor: not-allowed !important;
}

.drag-floating-avatar {
  position: fixed;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 99999;
  background: #2a2d32;
  border: 1px solid #c9a35c;
  border-radius: 6px;
  padding: 6px 14px;
  color: #e9e7e2;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 14px rgba(201, 163, 92, 0.4);
  user-select: none;
}

.avatar-handle {
  color: #c9a35c;
  font-weight: bold;
}

.avatar-title {
  color: #e9e7e2;
}

.avatar-dur {
  font-size: 10px;
  color: #9a9ea4;
  font-weight: 500;
}
</style>
