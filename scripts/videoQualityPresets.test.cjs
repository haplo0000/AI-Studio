const assert = require('node:assert/strict');
const {
  PRESETS,
  estimatePresetRisk,
  getDefaultPreset,
  listPresetSummaries,
} = require('../electron/videoQualityPresets.cjs');

assert.equal(PRESETS.fast_test.steps, 16);
assert.equal(PRESETS.balanced.defaultDuration, 4);
assert.equal(PRESETS.quality.steps, 24);

const fast = estimatePresetRisk({
  sourcePath: '',
  qualityPreset: 'fast_test',
  duration: 2,
  motionStrength: 0.4,
});
assert.equal(fast.level, 'ok');
assert.ok(fast.estimatedTimeLabel.includes('s'));

const summaries = listPresetSummaries('');
assert.equal(summaries.length, 3);
assert.ok(summaries.every((s) => s.estimatedTimeLabel && s.vramRiskLabel));

const defaultPreset = getDefaultPreset('');
assert.ok(['fast_test', 'balanced'].includes(defaultPreset));

console.log('videoQualityPresets.test.cjs passed');
