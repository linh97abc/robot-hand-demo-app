import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Universal Loader Function that builds a hand model rig from GLB file and JSON config.
 * @param {Object} THREE - Three.js instance
 * @param {Object} config - Hand model JSON configuration
 * @param {String} [overrideGlbUrl] - Optional GLB URL override
 * @returns {Promise<{model: Object, RIG: Object, wrist: Object}>}
 */
export async function loadHandModelFromConfig(THREE, config, overrideGlbUrl) {
  const loader = new GLTFLoader();
  const url = overrideGlbUrl || config.glbUrl;
  let gltf;

  try {
    gltf = await loader.loadAsync(url);
  } catch (err) {
    console.warn(`Failed to load ${url}, attempting fallback ${config.fallbackGlbUrl}`, err);
    gltf = await loader.loadAsync(config.fallbackGlbUrl);
  }

  const model = gltf.scene;
  const RIG = {};

  // Build finger joint rig
  if (Array.isArray(config.fingerNames)) {
    config.fingerNames.forEach((name) => {
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
  }

  // Parse thumb mount
  if (config.thumbMount && config.thumbMount.nodeName) {
    const key = config.thumbMount.key || 'thumbMount';
    RIG[key] = model.getObjectByName(config.thumbMount.nodeName);
  }

  // Parse wrist
  let wrist = null;
  if (config.wrist && config.wrist.nodeName) {
    wrist = model.getObjectByName(config.wrist.nodeName) || model;
  }

  return { model, RIG, wrist };
}
