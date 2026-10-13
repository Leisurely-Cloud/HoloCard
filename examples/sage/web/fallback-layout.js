// CSS depth is an approximation of the authored layer profile in pixel units.
export function fallbackLayerDepths(parameters) {
  const background = parameters.backgroundDepth * 100;
  const subject = parameters.subjectDepth * 100;
  const effects = parameters.effectsDepth * 100;
  return { background, subject, effects, lineart: subject + 1,
    text: Math.max(0, background, subject, effects) + 28 };
}
