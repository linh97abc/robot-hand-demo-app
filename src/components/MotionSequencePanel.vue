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
  <aside class="w-[360px] flex-none bg-panel text-panel-fg border-r border-[#2a2d32] flex flex-col pt-4 px-3.5 pb-5 gap-3.5 box-border font-ui select-none overflow-y-auto overflow-x-hidden">
    <!-- Header -->
    <div>
      <h1 class="text-[14.5px] tracking-[.08em] uppercase m-0 mb-1.5 font-bold text-panel-fg">KỊCH BẢN CHUYỂN ĐỘNG</h1>
      <p class="text-[11px] leading-[1.45] text-muted m-0 mb-3">
        Ghi lại tư thế hiện tại thành các waypoint. Bấm vào 1 waypoint để chọn — chỉnh sửa tư thế bằng các thanh trượt ở cột bên phải. Xuất/nhập file JSON để dùng lại.
      </p>

      <div class="flex gap-2">
        <button
          type="button"
          :disabled="isPlaying"
          class="appearance-none bg-[#282b30] border border-line text-panel-fg rounded-md py-1.5 px-3.5 text-[11.5px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#32363c] hover:border-[#55595f] disabled:opacity-40 disabled:cursor-not-allowed"
          @click="emit('export-json')"
        >
          Xuất JSON
        </button>
        <button
          type="button"
          :disabled="isPlaying"
          class="appearance-none bg-[#282b30] border border-line text-panel-fg rounded-md py-1.5 px-3.5 text-[11.5px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#32363c] hover:border-[#55595f] disabled:opacity-40 disabled:cursor-not-allowed"
          @click="triggerImport"
        >
          Nhập JSON
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          :disabled="isPlaying"
          @change="handleFileChange"
        />
      </div>
    </div>

    <!-- Timeline Scrub section -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[10.5px] text-muted font-medium tabular-nums">
        <span>{{ Math.round(currentTimeMs) }} ms / {{ Math.round(totalTimeMs) }} ms</span>
      </div>
      <input
        type="range"
        min="0"
        :max="totalTimeMs || 100"
        :value="currentTimeMs"
        @input="e => emit('seek', parseFloat(e.target.value))"
        class="w-full accent-gold cursor-pointer"
      />
    </div>

    <!-- Controls toolbar -->
    <div class="flex gap-1.5 items-center flex-wrap">
      <button
        type="button"
        :disabled="isPlaying"
        class="appearance-none bg-[#282b30] border border-[#484c54] text-panel-fg rounded-md py-1.5 px-2.5 text-[11.5px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#343840] hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
        @click="emit('add-waypoint')"
      >
        + Thêm waypoint
      </button>

      <button
        v-if="!isPlaying"
        type="button"
        class="appearance-none bg-[#24272b] border border-line text-panel-fg rounded-md py-1.5 px-2.5 text-[11.5px] font-semibold cursor-pointer hover:bg-[#2f3338]"
        @click="emit('play')"
      >
        ► Phát
      </button>
      <button
        v-else
        type="button"
        class="appearance-none bg-gold border border-gold text-panel rounded-md py-1.5 px-2.5 text-[11.5px] font-semibold cursor-pointer"
        @click="emit('pause')"
      >
        ⏸ Tạm dừng
      </button>

      <button
        type="button"
        class="appearance-none bg-[#24272b] border border-line text-panel-fg rounded-md py-1.5 px-2.5 text-[11.5px] font-semibold cursor-pointer hover:bg-[#2f3338]"
        @click="emit('stop')"
      >
        ■ Dừng
      </button>

      <button
        type="button"
        class="appearance-none rounded-md py-1.5 px-2.5 text-[11.5px] font-semibold cursor-pointer"
        :class="isLooping
          ? 'bg-gold border border-gold text-panel'
          : 'bg-[#24272b] border border-line text-panel-fg hover:bg-[#2f3338]'"
        @click="emit('toggle-loop')"
      >
        ↻ Lặp
      </button>
    </div>

    <!-- Segments Table / List Header -->
    <div class="grid grid-cols-[84px_114px_74px_1fr] items-center text-[8.5px] tracking-[.01em] text-dim font-bold pb-1 border-b border-[#2a2d32] mt-1 whitespace-nowrap">
      <span>WAYPOINT</span>
      <span class="text-center whitespace-nowrap">CHUYỂN ĐỘNG (ms)</span>
      <span class="text-center whitespace-nowrap">DỪNG (ms)</span>
      <span></span>
    </div>

    <!-- Segments List -->
    <div v-if="segments.length === 0" class="flex flex-col gap-1.5 flex-1 min-h-[100px] overflow-y-auto overflow-x-hidden">
      <div class="text-[11px] text-dim italic py-4 text-center">
        Chưa có waypoint nào. Bấm "+ Thêm waypoint" để bắt đầu tạo kịch bản.
      </div>
    </div>

    <TransitionGroup v-else name="flip-list" tag="div" class="segments-list flex flex-col gap-1.5 flex-1 min-h-[100px] overflow-y-auto overflow-x-hidden">
      <div
        v-for="item in displaySegments"
        :key="item.id || item.origIndex"
        class="segment-row rounded-md"
        :data-index="item.origIndex"
        :class="item.isPlaceholder
          ? 'flex items-center justify-center bg-gold/[0.12] border-[1.5px] border-dashed border-gold shadow-[inset_0_0_12px_rgba(201,163,92,0.2)] h-[38px] px-2 pointer-events-none w-full box-border'
          : (activeWaypointIndex === item.origIndex
              ? 'grid grid-cols-[84px_114px_74px_1fr] items-center bg-[#2a2d32] border-2 border-gold py-[4px] px-1.5 cursor-pointer animate-[playing-glow_1s_ease-in-out_infinite]'
              : (selectedWaypointIndex === item.origIndex
                  ? 'grid grid-cols-[84px_114px_74px_1fr] items-center bg-[#2a2d32] border border-gold py-[5px] px-1.5 cursor-pointer shadow-[0_0_8px_rgba(201,163,92,0.2)]'
                  : 'grid grid-cols-[84px_114px_74px_1fr] items-center bg-[#23262a] border border-[#32363b] py-[5px] px-1.5 cursor-pointer transition-colors duration-150 hover:border-[#484c54] hover:bg-[#272a2e]'))"
        @click="!item.isPlaceholder && emit('select-waypoint', item.origIndex)"
      >
        <template v-if="item.isPlaceholder">
          <div class="flex items-center justify-center gap-2 text-gold text-[11px] font-bold tracking-[.02em] w-full">
            <span class="text-xs font-bold animate-[bounce-slot_0.7s_infinite_alternate]">↓</span>
            <span>Thả vào đây (chèn {{ item.name || `WP ${item.origIndex + 1}` }})</span>
          </div>
        </template>

        <template v-else>
          <!-- Reorder Handle & Waypoint Name Textbox -->
          <div class="flex items-center gap-1">
            <span
              class="text-[11px] select-none [touch-action:none] py-1 px-0.5"
              :class="isPlaying ? 'text-dim cursor-not-allowed opacity-40' : 'text-dim cursor-grab active:cursor-grabbing active:text-gold'"
              title="Nhấn giữ và kéo thả để đổi thứ tự"
              @pointerdown="e => startPointerDrag(item.origIndex, e)"
            >⋮⋮</span>
            <input
              type="text"
              :disabled="isPlaying"
              class="w-[58px] bg-[#191b1d] border border-[#373b42] rounded py-[3px] px-[5px] text-[11px] font-bold outline-none focus:border-gold focus:bg-[#23262b] disabled:opacity-40 disabled:cursor-not-allowed"
              :class="selectedWaypointIndex === item.origIndex ? 'text-gold' : 'text-panel-fg'"
              :value="item.name"
              :placeholder="`WP ${item.origIndex + 1}`"
              title="Nhấp vào để chỉnh sửa tên Waypoint"
              @click.stop
              @input="e => onNameChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Duration input -->
          <div class="flex justify-center">
            <input
              type="number"
              min="0"
              step="100"
              :disabled="isPlaying"
              class="w-[56px] bg-[#191b1d] border border-[#373b42] text-panel-fg rounded py-[3px] px-1 text-[11px] text-center outline-none focus:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
              :value="item.duration_ms"
              @click.stop
              @input="e => onDurationChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Dwell input -->
          <div class="flex justify-center">
            <input
              type="number"
              min="0"
              step="100"
              :disabled="isPlaying"
              class="w-[56px] bg-[#191b1d] border border-[#373b42] text-panel-fg rounded py-[3px] px-1 text-[11px] text-center outline-none focus:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
              :value="item.dwell_ms"
              @click.stop
              @input="e => onDwellChange(item.origIndex, e.target.value)"
            />
          </div>

          <!-- Row actions: Delete -->
          <div class="flex items-center justify-end gap-[3px]">
            <button
              type="button"
              :disabled="isPlaying"
              class="appearance-none bg-transparent border-none text-dim cursor-pointer text-xs py-0.5 px-1 leading-none hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-dim"
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
    <div class="text-[10px] text-dim leading-[1.4] border-t border-[#2c3035] pt-2.5 mt-auto">
      Định dạng file: {"segments": [ {"waypoint": {"thumb.0": 10, ...}, "duration_ms": 800, "dwell_ms": 0}, ... ]}. duration_ms là thời gian chuyển động, dwell_ms là thời gian dừng nghỉ tại waypoint đó.
    </div>

    <!-- Floating Drag Preview Avatar following mouse -->
    <Teleport to="body">
      <div
        v-if="isPointerDragging && draggingIndex !== null && segments[draggingIndex]"
        class="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[99999] bg-[#2a2d32] border border-gold rounded-md py-1.5 px-3.5 text-panel-fg text-[11px] font-bold flex items-center gap-2 shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_14px_rgba(201,163,92,0.4)] select-none"
        :style="{
          left: dragPosition.x + 'px',
          top: dragPosition.y + 'px',
        }"
      >
        <span class="text-gold font-bold">⋮⋮</span>
        <span class="text-panel-fg">{{ segments[draggingIndex].name || `WP ${draggingIndex + 1}` }}</span>
        <span class="text-[10px] text-muted font-medium">{{ segments[draggingIndex].duration_ms }} ms</span>
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
