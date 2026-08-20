<script setup>
import { ref, computed } from 'vue';

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
const draggedIndex = ref(null);

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

function onDurationChange(index, value) {
  const val = Math.max(0, parseInt(value, 10) || 0);
  emit('update-segment', { index, field: 'duration_ms', value: val });
}

function onDwellChange(index, value) {
  const val = Math.max(0, parseInt(value, 10) || 0);
  emit('update-segment', { index, field: 'dwell_ms', value: val });
}

function moveUp(index) {
  if (index > 0) {
    emit('reorder-waypoints', { fromIndex: index, toIndex: index - 1 });
  }
}

function moveDown(index) {
  if (index < props.segments.length - 1) {
    emit('reorder-waypoints', { fromIndex: index, toIndex: index + 1 });
  }
}

// Drag and drop handlers
function onDragStart(index, e) {
  draggedIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDrop(targetIndex) {
  if (draggedIndex.value !== null && draggedIndex.value !== targetIndex) {
    emit('reorder-waypoints', { fromIndex: draggedIndex.value, toIndex: targetIndex });
  }
  draggedIndex.value = null;
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
      <span class="col-name"></span>
      <span class="col-dur">CHUYỂN ĐỘNG (MS)</span>
      <span class="col-dwell">DỪNG (MS)</span>
      <span class="col-action"></span>
    </div>

    <!-- Segments List -->
    <div class="segments-list">
      <div v-if="segments.length === 0" class="empty-state">
        Chưa có waypoint nào. Bấm "+ Thêm waypoint" để bắt đầu tạo kịch bản.
      </div>

      <div
        v-for="(seg, index) in segments"
        :key="seg.id || index"
        class="segment-row"
        :class="{ selected: selectedWaypointIndex === index }"
        draggable="true"
        @dragstart="e => onDragStart(index, e)"
        @dragover="onDragOver"
        @drop="() => onDrop(index)"
      >
        <!-- Reorder Handle & Waypoint Button -->
        <div class="wp-title-cell">
          <span class="drag-handle" title="Kéo thả để đổi thứ tự">⋮⋮</span>
          <button
            type="button"
            class="btn-wp"
            :class="{ active: selectedWaypointIndex === index }"
            @click="emit('select-waypoint', index)"
          >
            {{ seg.name || `WP ${index + 1}` }}
          </button>
        </div>

        <!-- Duration input -->
        <div class="input-cell">
          <input
            type="number"
            min="0"
            step="100"
            :value="seg.duration_ms"
            @input="e => onDurationChange(index, e.target.value)"
          />
        </div>

        <!-- Dwell input -->
        <div class="input-cell">
          <input
            type="number"
            min="0"
            step="100"
            :value="seg.dwell_ms"
            @input="e => onDwellChange(index, e.target.value)"
          />
        </div>

        <!-- Row actions: Up, Down, Delete -->
        <div class="action-cell">
          <button
            type="button"
            class="btn-move"
            :disabled="index === 0"
            @click.stop="moveUp(index)"
            title="Di chuyển lên"
          >
            ▲
          </button>
          <button
            type="button"
            class="btn-move"
            :disabled="index === segments.length - 1"
            @click.stop="moveDown(index)"
            title="Di chuyển xuống"
          >
            ▼
          </button>
          <button
            type="button"
            class="btn-del"
            @click.stop="emit('delete-waypoint', index)"
            title="Xóa waypoint"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Footer JSON Spec Hint -->
    <div class="script-footer">
      Định dạng file: {"segments": [ {"waypoint": {"thumb.0": 10, ...}, "duration_ms": 800, "dwell_ms": 0}, ... ]}. duration_ms là thời gian chuyển động, dwell_ms là thời gian dừng nghỉ tại waypoint đó.
    </div>
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
  padding: 16px 18px 20px;
  gap: 14px;
  box-sizing: border-box;
  font-family: Helvetica, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
  overflow-y: auto;
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
  grid-template-columns: 110px 100px 90px 1fr;
  font-size: 9.5px;
  letter-spacing: .06em;
  color: #71767c;
  font-weight: 700;
  padding-bottom: 4px;
  border-bottom: 1px solid #2a2d32;
  margin-top: 4px;
}

.col-dur, .col-dwell {
  text-align: center;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
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
  grid-template-columns: 110px 100px 90px 1fr;
  align-items: center;
  background: #23262a;
  border: 1px solid #32363b;
  border-radius: 6px;
  padding: 5px 8px;
  transition: border-color 0.15s, background-color 0.15s;
}

.segment-row:hover {
  border-color: #484c54;
}

.segment-row.selected {
  border-color: #c9a35c;
  background: #2a2d32;
}

.wp-title-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.drag-handle {
  color: #55595f;
  cursor: grab;
  font-size: 10px;
  user-select: none;
}

.btn-wp {
  appearance: none;
  background: #2b2f34;
  border: 1px solid #3e4249;
  color: #e9e7e2;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-wp.active {
  background: #c9a35c;
  border-color: #c9a35c;
  color: #1c1e21;
}

.input-cell {
  display: flex;
  justify-content: center;
}

.input-cell input {
  width: 68px;
  background: #191b1d;
  border: 1px solid #373b42;
  color: #e9e7e2;
  border-radius: 4px;
  padding: 3px 6px;
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

.btn-move {
  appearance: none;
  background: transparent;
  border: none;
  color: #71767c;
  cursor: pointer;
  font-size: 9px;
  padding: 2px 3px;
}

.btn-move:hover:not(:disabled) {
  color: #c9a35c;
}

.btn-move:disabled {
  opacity: 0.25;
  cursor: default;
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
