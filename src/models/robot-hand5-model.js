import { loadHandModelFromConfig } from './hand-loader.js';
import hand5Config from './configs/robot-hand5.json';

export async function buildHandModel5(THREE, glbUrl) {
  return loadHandModelFromConfig(THREE, hand5Config, glbUrl);
}

export const buildHandModel = buildHandModel5;
