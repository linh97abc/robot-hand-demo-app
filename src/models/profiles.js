import { loadHandModelFromConfig } from './hand-loader.js';
import hand5Config from './configs/robot-hand5.json';
import hand3Config from './configs/robot-hand3.json';
import hand5Poses from './poses/robot-hand5-poses.json';
import hand3Poses from './poses/robot-hand3-poses.json';

export const DEG = Math.PI / 180;

function createProfile(config, poses) {
  return {
    ...config,
    poses: poses || config.poses || {},
    buildModel: (url) => loadHandModelFromConfig(config, url),
    thumbExtra: config.thumbExtra ? {
      ...config.thumbExtra,
      read: (RIG) => {
        const node = RIG[config.thumbExtra.targetKey];
        if (!node) return 0;
        const mult = config.thumbExtra.multiplier || 1;
        const actualDeg = (mult * node.rotation[config.thumbExtra.axis]) / DEG;
        const span = (config.thumbExtra.max || 180) - (config.thumbExtra.min || 0);
        if (span <= 0) return 0;
        return Math.round(((actualDeg - (config.thumbExtra.min || 0)) / span) * 1000);
      },
      apply: (RIG, wrist, permilleVal) => {
        const node = RIG[config.thumbExtra.targetKey];
        if (!node) return;
        const mult = config.thumbExtra.multiplier || 1;
        const minDeg = config.thumbExtra.min || 0;
        const maxDeg = config.thumbExtra.max || 180;
        const actualDeg = minDeg + (permilleVal / 1000) * (maxDeg - minDeg);
        node.rotation[config.thumbExtra.axis] = mult * actualDeg * DEG;
      },
    } : null,
  };
}

/**
 * Calculates joint offset angle using per-joint config fallback to model profile default.
 */
export function getJointOffset(profile, fingerConfig, jointIndex) {
  if (fingerConfig && fingerConfig.jointOffsets && fingerConfig.jointOffsets[jointIndex] !== undefined) {
    return fingerConfig.jointOffsets[jointIndex];
  }
  return profile.jointAngleOffset || 0;
}

/**
 * Central Model Registry: Keyed automatically by config.name!
 */
export const PROFILES = {
  [hand5Config.name]: createProfile(hand5Config, hand5Poses),
  [hand3Config.name]: createProfile(hand3Config, hand3Poses),
};
