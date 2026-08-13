// 3-finger gripper model loaded from GLB file
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function buildHandModel3(THREE, glbUrl = './assets/robot-hand3.glb') {
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(glbUrl);
  } catch (err) {
    console.warn(`Failed to load ${glbUrl}, attempting fallback /assets/robot-hand3.glb`, err);
    gltf = await loader.loadAsync('/assets/robot-hand3.glb');
  }
  const model = gltf.scene;

  const RIG = {};
  const fingerNames = ['index', 'middle', 'thumb'];

  fingerNames.forEach((name) => {
    const root = model.getObjectByName(name);
    if (!root) return;
    root.userData.joints = [];
    let j = 1;
    while (true) {
      const joint = model.getObjectByName(`${name}_joint${j}`);
      if (!joint) break;
      root.userData.joints.push(joint);
      j++;
    }
    RIG[name] = root;
  });

  RIG.thumbYaw = model.getObjectByName('thumb_yaw_mount');
  const wrist = model.getObjectByName('wrist_pivot_inert') || model;

  return { model, RIG, wrist };
}
