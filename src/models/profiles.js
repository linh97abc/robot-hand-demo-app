import * as THREE from 'three';
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
    thumbExtra: null,
  };
}

/**
 * Gets joint definition from jointNode or fingerConfig.
 */

function getJointDef(jointNode, fingerConfig, jointIndex) {
  const cfgDef = fingerConfig?.joints?.[jointIndex];
  if (typeof cfgDef === 'object') return cfgDef;
  return jointNode?.userData?.urdfDef || null;
}

/**
 * Gets joint type ('revolute' or 'prismatic'). Default is 'revolute'.
 */
export function getJointType(jointNode, fingerConfig, jointIndex) {
  const jointDef = getJointDef(jointNode, fingerConfig, jointIndex);
  return jointDef?.type || 'revolute';
}

/**
 * Gets joint mimic configuration if defined. Default is null.
 */
export function getJointMimic(jointNode, fingerConfig, jointIndex) {
  const jointDef = getJointDef(jointNode, fingerConfig, jointIndex);
  return jointDef?.mimic || null;
}

/**
 * Gets joint limits { lower, upper, effort, velocity } with automatic default fallbacks.
 */
export function getJointLimits(jointNode, fingerConfig, jointIndex) {
  const jointDef = getJointDef(jointNode, fingerConfig, jointIndex);
  const urdfLimits = jointDef?.limits;
  const maxVal = (fingerConfig && fingerConfig.max && fingerConfig.max[jointIndex] !== undefined)
    ? fingerConfig.max[jointIndex]
    : 180;

  return {
    lower: urdfLimits?.lower ?? 0,
    upper: urdfLimits?.upper ?? maxVal,
    effort: urdfLimits?.effort ?? 10.0,
    velocity: urdfLimits?.velocity ?? 3.0,
  };
}

/**
 * Gets joint dynamics { damping, friction } with automatic default fallbacks.
 */
export function getJointDynamics(jointNode, fingerConfig, jointIndex) {
  const jointDef = getJointDef(jointNode, fingerConfig, jointIndex);
  const urdfDynamics = jointDef?.dynamics;
  return {
    damping: urdfDynamics?.damping ?? 0.1,
    friction: urdfDynamics?.friction ?? 0.05,
  };
}

/**
 * Gets normalized Three.js 3D vector for joint rotation axis (supports arbitrary [x,y,z] vectors & 'x','y','z').
 */
export function getJointAxisVector(jointNode, fingerConfig, jointIndex) {
  const jointDef = getJointDef(jointNode, fingerConfig, jointIndex);
  const urdfAxis = jointDef?.axis;

  if (urdfAxis) {
    if (Array.isArray(urdfAxis)) {
      return new THREE.Vector3(...urdfAxis).normalize();
    }
    if (urdfAxis === 'y') return new THREE.Vector3(0, 1, 0);
    if (urdfAxis === 'z') return new THREE.Vector3(0, 0, 1);
    return new THREE.Vector3(1, 0, 0);
  }

  const axisChar = (fingerConfig && fingerConfig.jointAxes && fingerConfig.jointAxes[jointIndex])
    ? fingerConfig.jointAxes[jointIndex]
    : 'x';

  if (axisChar === 'y') return new THREE.Vector3(0, 1, 0);
  if (axisChar === 'z') return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(1, 0, 0);
}

/**
 * Central Model Registry: Keyed automatically by config.name!
 */
export const PROFILES = {
  [hand5Config.name]: createProfile(hand5Config, hand5Poses),
  [hand3Config.name]: createProfile(hand3Config, hand3Poses),
};
