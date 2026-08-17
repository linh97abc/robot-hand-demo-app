import { loadHandModelFromConfig } from './hand-loader.js';
import hand3Config from './configs/robot-hand3.json';

export async function buildHandModel3(THREE, glbUrl) {
  return loadHandModelFromConfig(THREE, hand3Config, glbUrl);
}
