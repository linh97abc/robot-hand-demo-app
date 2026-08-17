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

  // Build finger joint rig from JSON configuration (no hardcoded naming assumption)
  if (config.fingers && typeof config.fingers === 'object') {
    for (const [fingerKey, fingerConfig] of Object.entries(config.fingers)) {
      const rootNodeName = fingerConfig.rootNode || fingerKey;
      const root = model.getObjectByName(rootNodeName);
      if (!root) continue;

      root.userData.joints = Array.isArray(fingerConfig.joints)
        ? fingerConfig.joints.map((jName) => model.getObjectByName(jName)).filter(Boolean)
        : [];

      RIG[fingerKey] = root;
    }
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
