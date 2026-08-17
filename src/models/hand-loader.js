import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Universal Loader Function that builds a hand model rig from GLB file and JSON config.
 * @param {Object} config - Hand model JSON configuration
 * @param {String} [overrideGlbUrl] - Optional GLB URL override
 * @returns {Promise<{model: Object, RIG: Object, wrist: Object}>}
 */
export async function loadHandModelFromConfig(config, overrideGlbUrl) {
  const loader = new GLTFLoader();
  const defaultUrl = `./assets/${config.name}.glb`;
  const fallbackUrl = `/assets/${config.name}.glb`;
  const url = overrideGlbUrl || config.glbUrl || defaultUrl;
  let gltf;

  try {
    gltf = await loader.loadAsync(url);
  } catch (err) {
    console.warn(`Failed to load ${url}, attempting fallback ${fallbackUrl}`, err);
    gltf = await loader.loadAsync(fallbackUrl);
  }

  const model = gltf.scene;
  const RIG = {};

  // Build finger joint rig from JSON configuration
  const fingerList = Array.isArray(config.fingers)
    ? config.fingers
    : (config.fingers && typeof config.fingers === 'object' ? Object.values(config.fingers) : []);

  fingerList.forEach((fingerConfig) => {
    const fingerKey = fingerConfig.key;
    const rootNodeName = fingerConfig.rootNode || fingerKey;
    const root = model.getObjectByName(rootNodeName);
    if (!root) return;

    root.userData.joints = Array.isArray(fingerConfig.joints)
      ? fingerConfig.joints.map((jName) => model.getObjectByName(jName)).filter(Boolean)
      : [];

    RIG[fingerKey] = root;
  });

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
