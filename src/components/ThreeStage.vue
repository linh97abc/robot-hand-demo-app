<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const props = defineProps({
  model: { type: Object, default: null },
  background: { type: String, default: '#efece6' },
  modelName: { type: String, default: 'robot-hand' },
});

const containerRef = ref(null);
let scene, camera, renderer, controls, animationId = null;
let keyLight, shadowGround;
let renderRequested = false;

function initThree() {
  const container = containerRef.value;
  if (!container) return;

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(props.background);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 500);
  camera.position.set(3, 2.2, 4);

  // Neutral studio lighting from original three-d-stage
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0);
  scene.add(hemi);

  keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff4e6, 0.5);
  fillLight.position.set(-5, 3, -4);
  scene.add(fillLight);

  // Soft ground shadow plane
  shadowGround = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  shadowGround.rotation.x = -Math.PI / 2;
  shadowGround.receiveShadow = true;
  scene.add(shadowGround);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Render on demand when OrbitControls changes
  controls.addEventListener('change', () => requestRender());

  const resizeObserver = new ResizeObserver(() => onResize());
  resizeObserver.observe(container);

  requestRender();
}

function onResize() {
  if (!containerRef.value || !renderer || !camera) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  requestRender();
}

function animateLoop() {
  let needsMore = false;
  if (controls) {
    needsMore = controls.update() || renderRequested;
  }
  renderRequested = false;

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  if (needsMore) {
    animationId = requestAnimationFrame(animateLoop);
  } else {
    animationId = null;
  }
}

function requestRender() {
  renderRequested = true;
  if (!animationId) {
    animationId = requestAnimationFrame(animateLoop);
  }
}

watch(
  () => props.model,
  (newModel, oldModel) => {
    if (oldModel && scene) scene.remove(oldModel);
    if (newModel && scene) {
      newModel.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      scene.add(newModel);

      // Auto frame model using bounding sphere
      const box = new THREE.Box3().setFromObject(newModel);
      if (!box.isEmpty()) {
        shadowGround.position.y = box.min.y;
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.35;
        const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
        camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
        camera.near = Math.max(dist / 100, 0.01);
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controls.target.copy(sphere.center);
        controls.update();

        const span = sphere.radius * 3;
        keyLight.shadow.camera.left = -span;
        keyLight.shadow.camera.right = span;
        keyLight.shadow.camera.top = span;
        keyLight.shadow.camera.bottom = -span;
        keyLight.shadow.camera.updateProjectionMatrix();
      }
      requestRender();
    }
  },
  { immediate: true }
);

watch(
  () => props.background,
  (newBg) => {
    if (scene) scene.background = new THREE.Color(newBg);
    requestRender();
  }
);

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function nameParts(object) {
  const mats = [];
  const seen = new Set();
  let meshI = 0, matI = 0;
  object.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.name) o.name = 'part_' + meshI++;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m || mats.includes(m)) continue;
      if (!m.name) m.name = 'mat_' + matI++;
      while (seen.has(m.name)) m.name = m.name + '_' + matI++;
      seen.add(m.name);
      mats.push(m);
    }
  });
  return mats;
}

function exportOBJ() {
  if (!props.model) return;
  const mats = nameParts(props.model);
  const base = props.modelName || 'robot-hand';
  const exporter = new OBJExporter();
  const obj = 'mtllib ' + base + '.mtl\n' + exporter.parse(props.model);
  let mtl = '# Exported by three-d-stage\n';
  for (const m of mats) {
    const c = m.color || { r: 0.8, g: 0.8, b: 0.8 };
    const rough = typeof m.roughness === 'number' ? m.roughness : 0.5;
    const opacity = typeof m.opacity === 'number' ? m.opacity : 1;
    mtl += 'newmtl ' + m.name + '\n';
    mtl += 'Kd ' + c.r.toFixed(4) + ' ' + c.g.toFixed(4) + ' ' + c.b.toFixed(4) + '\n';
    mtl += 'Ks 0.2000 0.2000 0.2000\n';
    mtl += 'Ns ' + Math.round((1 - rough) * 200) + '\n';
    mtl += 'd ' + opacity.toFixed(4) + '\n\n';
  }
  download(new Blob([obj], { type: 'text/plain' }), base + '.obj');
  download(new Blob([mtl], { type: 'text/plain' }), base + '.mtl');
}

function exportGLTF() {
  if (!props.model) return;
  nameParts(props.model);
  const base = props.modelName || 'robot-hand';
  const exporter = new GLTFExporter();
  exporter.parse(
    props.model,
    (buf) => {
      download(new Blob([buf], { type: 'model/gltf-binary' }), base + '.glb');
    },
    (err) => console.error('Error exporting GLTF:', err),
    { binary: true }
  );
}

defineExpose({ requestRender, exportOBJ, exportGLTF, getTHREE: () => THREE });

onMounted(() => {
  initThree();
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer && renderer.domElement) renderer.domElement.remove();
  if (renderer) renderer.dispose();
});
</script>

<template>
  <div class="stage-container">
    <div ref="containerRef" class="canvas-wrapper"></div>
    <div class="note">Drag to orbit · scroll to zoom · right-drag to pan</div>
    <div class="toolbar">
      <button type="button" @click="exportOBJ">Download OBJ + MTL</button>
      <button type="button" @click="exportGLTF">Download GLB</button>
    </div>
  </div>
</template>

<style scoped>
.stage-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #efece6;
  overflow: hidden;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
}

.toolbar {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  z-index: 10;
}

.toolbar button {
  appearance: none;
  border: 1px solid rgba(20, 20, 19, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #1a1915;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  padding: 9px 12px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.toolbar button:hover {
  background: #ffffff;
}

.toolbar button:active {
  transform: translateY(1px);
}

.note {
  position: absolute;
  left: 16px;
  bottom: 16px;
  max-width: 60%;
  font: 400 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: rgba(26, 25, 21, 0.55);
  user-select: none;
  pointer-events: none;
}
</style>
