import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Universal Loader Function that builds a hand model rig from GLB file and JSON config.
 * 100% Normalized loader operating on unified fingers & joint definitions.
 * @param {Object} config - Hand model JSON configuration
 * @param {String} [overrideGlbUrl] - Optional GLB URL override
 * @returns {Promise<{model: Object, RIG: Object, wrist: null}>}
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
    const root = model.getObjectByName(rootNodeName) || model;

    root.userData.joints = Array.isArray(fingerConfig.joints)
      ? fingerConfig.joints.map((jointDef) => {
          const nodeName = typeof jointDef === 'string' ? jointDef : (jointDef.name || jointDef.nodeName);
          const jointNode = model.getObjectByName(nodeName);
          if (jointNode && typeof jointDef === 'object') {
            jointNode.userData.urdfDef = jointDef;
          }
          return jointNode;
        }).filter(Boolean)
      : [];

    RIG[fingerKey] = root;
  });

  return { model, RIG, wrist: null };
}
