// 5-finger robot hand model loaded from GLB file
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function buildHandModel5(THREE, glbUrl = './assets/robot-hand5.glb') {
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(glbUrl);
  } catch (err) {
    console.warn(`Failed to load ${glbUrl}, attempting fallback /assets/robot-hand5.glb`, err);
    gltf = await loader.loadAsync('/assets/robot-hand5.glb');
  }
  const model = gltf.scene;

  const RIG = {};
  const fingerNames = ['index', 'middle', 'ring', 'pinky', 'thumb'];

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

  RIG.thumbMount = model.getObjectByName('thumb_cmc_mount');
  const wrist = model.getObjectByName('wrist_pivot');

  return { model, RIG, wrist };
}

export const buildHandModel = buildHandModel5;
