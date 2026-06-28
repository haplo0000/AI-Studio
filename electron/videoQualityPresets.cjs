/** Wan2.2 5B presets tuned for ~8GB VRAM (RTX 5060 class). */

const PRESET_IDS = ['fast_test', 'balanced', 'quality'];

const PRESETS = {
  fast_test: {
    id: 'fast_test',
    label: 'Fast Test',
    tagline: 'Proof-of-life — fastest, lowest quality',
    maxDim: 384,
    maxPixels: 384 * 256,
    defaultDuration: 2,
    defaultMotionStrength: 0.4,
    steps: 16,
    cfgBase: 3,
    cfgMotionScale: 2,
    estimatedSecondsMin: 40,
    estimatedSecondsMax: 55,
    vramRisk: 'low',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Recommended — sharper motion, 8GB safe',
    maxDim: 512,
    maxPixels: 512 * 320,
    defaultDuration: 4,
    defaultMotionStrength: 0.5,
    steps: 20,
    cfgBase: 3,
    cfgMotionScale: 3,
    estimatedSecondsMin: 75,
    estimatedSecondsMax: 105,
    vramRisk: 'medium',
  },
  quality: {
    id: 'quality',
    label: 'Quality',
    tagline: 'Best on 8GB — slower, watch VRAM',
    maxDim: 512,
    maxPixels: 512 * 384,
    defaultDuration: 4,
    defaultMotionStrength: 0.55,
    steps: 24,
    cfgBase: 3.5,
    cfgMotionScale: 3,
    estimatedSecondsMin: 110,
    estimatedSecondsMax: 170,
    vramRisk: 'high',
  },
};

const BLOCK_PIXELS = 640 * 480;
const BLOCK_WORKLOAD = 640 * 480 * 65;
const WARN_WORKLOAD = 512 * 512 * 49;
const MAX_FRAMES = 65;

function resolvePreset(presetId) {
  return PRESETS[presetId] || PRESETS.fast_test;
}

function readImageDimensionsForPreset(imagePath, preset) {
  try {
    const { nativeImage } = require('electron');
    const img = nativeImage.createFromPath(imagePath);
    const size = img.getSize();
    if (size.width > 0 && size.height > 0) {
      const maxDim = preset.maxDim;
      const scale = Math.min(1, maxDim / Math.max(size.width, size.height));
      let width = Math.max(64, Math.round((size.width * scale) / 16) * 16);
      let height = Math.max(64, Math.round((size.height * scale) / 16) * 16);
      if (width * height > preset.maxPixels) {
        const pixelScale = Math.sqrt(preset.maxPixels / (width * height));
        width = Math.max(64, Math.round((width * pixelScale) / 16) * 16);
        height = Math.max(64, Math.round((height * pixelScale) / 16) * 16);
      }
      return { width, height };
    }
  } catch {
    // ignore
  }
  const aspect = preset.maxDim / Math.max(preset.maxPixels / preset.maxDim, 1);
  return {
    width: Math.min(preset.maxDim, 512),
    height: Math.max(64, Math.round(preset.maxPixels / preset.maxDim / 16) * 16),
  };
}

function durationToFrameLength(durationSec, fps = 16) {
  const raw = Math.round(Number(durationSec) * fps);
  return Math.max(17, Math.round((raw - 1) / 4) * 4 + 1);
}

function estimateTimeLabel(preset) {
  return `~${preset.estimatedSecondsMin}–${preset.estimatedSecondsMax}s`;
}

function vramRiskLabel(risk) {
  switch (risk) {
    case 'low':
      return 'Low VRAM risk';
    case 'medium':
      return 'Medium VRAM risk';
    case 'high':
      return 'High VRAM risk — may be slow';
    default:
      return risk;
  }
}

function estimatePresetRisk(params, durationToFrames = durationToFrameLength) {
  const preset = resolvePreset(params.qualityPreset);
  const duration = Number(params.duration ?? preset.defaultDuration);
  const motionStrength = Number(params.motionStrength ?? preset.defaultMotionStrength);
  const dims = readImageDimensionsForPreset(params.sourcePath, preset);
  const frameLength = durationToFrames(duration);
  const pixels = dims.width * dims.height;
  const workload = pixels * frameLength;

  let level = 'ok';
  let message = null;

  if (frameLength > MAX_FRAMES || pixels > BLOCK_PIXELS) {
    level = 'block';
    message = `${preset.label}: ${dims.width}×${dims.height} for ${duration}s likely exceeds 8GB VRAM. Try Fast Test or reduce duration.`;
  } else if (workload > BLOCK_WORKLOAD || (preset.id === 'quality' && duration >= 6)) {
    level = 'block';
    message = `${preset.label} at ${duration}s may exceed 8GB VRAM. Use Balanced or Fast Test instead.`;
  } else if (
    workload > WARN_WORKLOAD ||
    (preset.id === 'quality' && duration >= 4) ||
    (preset.id === 'balanced' && duration >= 6)
  ) {
    level = 'warn';
    message = `${preset.label}: ${dims.width}×${dims.height}, ${duration}s — tight on 8GB VRAM. Expect longer runs or occasional OOM.`;
  } else if (preset.vramRisk === 'high' || preset.vramRisk === 'medium') {
    level = preset.vramRisk === 'high' ? 'warn' : 'ok';
    if (preset.vramRisk === 'high') {
      message = `Quality preset uses more VRAM and time. Close other GPU apps before generating.`;
    }
  }

  return {
    preset: preset.id,
    level,
    message,
    dims,
    frameLength,
    steps: preset.steps,
    estimatedSecondsMin: preset.estimatedSecondsMin,
    estimatedSecondsMax: preset.estimatedSecondsMax,
    estimatedTimeLabel: estimateTimeLabel(preset),
    vramRisk: preset.vramRisk,
    vramRiskLabel: vramRiskLabel(preset.vramRisk),
  };
}

function getDefaultPreset(sourcePath) {
  const balanced = estimatePresetRisk({
    sourcePath,
    qualityPreset: 'balanced',
    duration: PRESETS.balanced.defaultDuration,
    motionStrength: PRESETS.balanced.defaultMotionStrength,
  });
  return balanced.level === 'block' ? 'fast_test' : 'balanced';
}

function listPresetSummaries(sourcePath) {
  return PRESET_IDS.map((id) => {
    const preset = PRESETS[id];
    const estimate = estimatePresetRisk({
      sourcePath,
      qualityPreset: id,
      duration: preset.defaultDuration,
      motionStrength: preset.defaultMotionStrength,
    });
    return {
      id: preset.id,
      label: preset.label,
      tagline: preset.tagline,
      defaultDuration: preset.defaultDuration,
      defaultMotionStrength: preset.defaultMotionStrength,
      steps: preset.steps,
      estimatedTimeLabel: estimate.estimatedTimeLabel,
      estimatedSecondsMin: estimate.estimatedSecondsMin,
      estimatedSecondsMax: estimate.estimatedSecondsMax,
      vramRisk: estimate.vramRisk,
      vramRiskLabel: estimate.vramRiskLabel,
      level: estimate.level,
      dims: estimate.dims,
    };
  });
}

function applyPresetToGenerationParams(params) {
  const preset = resolvePreset(params.qualityPreset);
  return {
    ...params,
    duration: Number(params.duration ?? preset.defaultDuration),
    motionStrength: Number(params.motionStrength ?? preset.defaultMotionStrength),
    steps: preset.steps,
    cfgBase: preset.cfgBase,
    cfgMotionScale: preset.cfgMotionScale,
    preset,
  };
}

module.exports = {
  PRESET_IDS,
  PRESETS,
  resolvePreset,
  readImageDimensionsForPreset,
  estimatePresetRisk,
  getDefaultPreset,
  listPresetSummaries,
  applyPresetToGenerationParams,
  durationToFrameLength,
};
