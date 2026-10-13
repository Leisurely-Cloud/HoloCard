export function layoutReliefLayers(reliefLayers, {subjectDepth, effectsDepth, subjectScale}) {
  const subjectZ = 0.541 + 1.818 * subjectDepth;
  const effectsZ = 0.541 + 1.818 * effectsDepth;
  const titleZ = Math.max(subjectZ, effectsZ) + 0.40;
  for (const mesh of reliefLayers.subject) {
    mesh.position.z = subjectZ;
    mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(1 / subjectScale);
  }
  for (const mesh of reliefLayers.effects) mesh.position.z = effectsZ;
  for (const mesh of reliefLayers.text) mesh.position.z = titleZ;
}
