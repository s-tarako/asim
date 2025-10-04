import { DEFAULT_FIELD_IMAGE } from "./constants.js";
import { loadField } from "./field.js";
import { InputManager } from "./controller.js";
import { HUD } from "./hud.js";
import { DifferentialDriveRobot, WheelCommand } from "./robot.js";
import { parseFieldQuery } from "./utils.js";

const canvas = document.getElementById("field-canvas");
const ctx = canvas.getContext("2d");
const hud = new HUD();
const inputManager = new InputManager();
const robot = new DifferentialDriveRobot();

let field = null;
let lastTimestamp = performance.now();
let isPaused = false;
let fps = 0;

async function bootstrap() {
  try {
    const fieldPath = parseFieldQuery(DEFAULT_FIELD_IMAGE);
    field = await loadField(fieldPath);
    resizeCanvas(field.pixelWidth, field.pixelHeight);
    startLoop();
  } catch (error) {
    console.error(error);
    showError(error.message);
  }
}

function resizeCanvas(width, height) {
  canvas.width = width;
  canvas.height = height;
}

function startLoop() {
  lastTimestamp = performance.now();
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  const dtMs = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const dt = Math.min(dtMs / 1000, 0.1);
  if (dt > 0) {
    fps = 1 / dt;
  }
  const input = inputManager.poll();
  if (input.paused) {
    isPaused = !isPaused;
  }

  if (!isPaused && field) {
    const command = WheelCommand.fromNormalized(input.left, input.right);
    robot.update(command, dt, { strafe: input.strafe });
    if (input.resetTrail) {
      robot.resetTrail();
    }
  } else if (input.resetTrail) {
    robot.resetTrail();
  }

  render(input);
  requestAnimationFrame(loop);
}

function render(input) {
  if (!field) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  field.draw(ctx);

  drawTrail();
  drawRobot();
  if (isPaused) {
    drawPauseOverlay();
  }

  const [leftSpeed, rightSpeed] = robot.wheelSpeeds;
  hud.update({
    leftSpeed,
    rightSpeed,
    strafeSpeed: robot.strafeSpeed,
    pose: { position: robot.state.position, heading: robot.state.heading },
    hasGamepad: input.hasGamepad,
    fps,
  });
}

function drawTrail() {
  const trail = robot.trail();
  if (trail.length < 2) return;
  ctx.strokeStyle = "rgba(80, 200, 120, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  trail.forEach((point, index) => {
    const px = field.toPixels(point);
    if (index === 0) ctx.moveTo(px.x, px.y);
    else ctx.lineTo(px.x, px.y);
  });
  ctx.stroke();
}

function drawRobot() {
  const outline = robot.bodyOutlineWorld().map((p) => field.toPixels(p));
  ctx.fillStyle = "rgba(20, 120, 220, 0.9)";
  ctx.beginPath();
  outline.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();

  const casterPx = field.toPixels(robot.casterWheelPosition());
  ctx.fillStyle = "rgba(240, 180, 50, 0.9)";
  ctx.beginPath();
  ctx.arc(casterPx.x, casterPx.y, Math.max(4, field.metersToPixels(0.08)), 0, Math.PI * 2);
  ctx.fill();
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "32px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
}

function showError(message) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.color = "#fff";
  overlay.style.fontSize = "1.2rem";
  overlay.style.zIndex = "999";
  overlay.textContent = message;
  document.body.appendChild(overlay);
}

bootstrap();
