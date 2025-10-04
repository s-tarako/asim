export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createVector(x = 0, y = 0) {
  return { x, y };
}

export function copyVector(vec) {
  return { x: vec.x, y: vec.y };
}

export function addScaledVector(target, vec, scale) {
  target.x += vec.x * scale;
  target.y += vec.y * scale;
}

export function vectorDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function parseFieldQuery(defaultPath) {
  const url = new URL(window.location.href);
  const param = url.searchParams.get("field");
  if (!param) {
    return defaultPath;
  }
  try {
    const decoded = decodeURIComponent(param);
    return decoded || defaultPath;
  } catch (error) {
    console.warn("Failed to parse field parameter", error);
    return defaultPath;
  }
}
