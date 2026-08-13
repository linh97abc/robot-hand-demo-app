# Skill: Update the robot hand model

Use when the user wants to change the hand's SHAPE or COLOR/MATERIAL by updating or re-exporting GLB models, without touching the joint-control UI.

## Where
- 5-Finger GLB model: `src/assets/robot-hand5.glb`.
- 3-Finger GLB model: `src/assets/robot-hand3.glb`.
- Loader modules: `src/models/robot-hand5-model.js` and `src/models/robot-hand3-model.js`.

## Updating GLB Models
- Both models are loaded asynchronously via `GLTFLoader`.
- To update a hand's 3D appearance or materials, replace the respective `.glb` file in `src/assets/`.
- Ensure the node naming conventions inside GLB are preserved so the rig auto-detects joints:
  - 5-Finger: `index`, `middle`, `ring`, `pinky`, `thumb`, `thumb_cmc_mount`, `wrist_pivot`, and joint nodes `${fingerName}_joint${N}`.
  - 3-Finger: `index`, `middle`, `thumb`, `thumb_yaw_mount`, `wrist_pivot_inert`, and joint nodes `${fingerName}_joint${N}`.

## Constraints to preserve
- Keep node names in GLB intact — required for rigging and slider binding in `index.html`.
- Keep offline compatibility — Three.js vendor files are located in `src/vendor/` (`GLTFLoader.js`, `utils/BufferGeometryUtils.js`, `utils/SkeletonUtils.js`).

## After editing
Reload `index.html` in a browser or `npm run dev` and check that the model renders and joints still respond to the sliders.
