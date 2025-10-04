import { DEADZONE, GAMEPAD_CONFIG } from "./constants.js";
import { clamp } from "./utils.js";

export class InputState {
  constructor({ left = 0, right = 0, strafe = 0, resetTrail = false, hasGamepad = false, paused = false } = {}) {
    this.left = left;
    this.right = right;
    this.strafe = strafe;
    this.resetTrail = resetTrail;
    this.hasGamepad = hasGamepad;
    this.paused = paused;
  }
}

export class InputManager {
  constructor(config = {}) {
    this.config = { ...GAMEPAD_CONFIG, ...config };
    this.keys = new Set();
    this.resetRequested = false;
    this.pauseRequested = false;
    this.gamepadIndex = null;
    this.prevButtonStates = new Map();
    this.hasGamepad = false;
    this.#setupKeyboard();
    window.addEventListener("gamepadconnected", (event) => {
      if (this.gamepadIndex === null) {
        this.gamepadIndex = event.gamepad.index;
      }
      this.hasGamepad = true;
    });
    window.addEventListener("gamepaddisconnected", (event) => {
      if (this.gamepadIndex === event.gamepad.index) {
        this.gamepadIndex = null;
      }
      this.hasGamepad = this.#scanForGamepad() !== null;
    });
  }

  #setupKeyboard() {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.key.toLowerCase());
      if (event.key === "r" || event.key === "R") {
        this.resetRequested = true;
      }
      if (event.key === "Escape" || event.key === "Esc" || event.key === "q" || event.key === "Q") {
        this.pauseRequested = true;
        event.preventDefault();
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  poll() {
    const pad = this.#scanForGamepad();
    const hasGamepad = Boolean(pad);
    let left = 0;
    let right = 0;
    let strafe = 0;
    let reset = false;

    if (pad) {
      left = this.#readAxis(pad, this.config.leftAxis, this.config.invertAxes);
      right = this.#readAxis(pad, this.config.rightAxis, this.config.invertAxes);
      const strafeAxis = this.#readAxis(pad, this.config.strafeAxis, false);
      if (Math.abs(strafeAxis) > DEADZONE) {
        strafe = clamp(strafeAxis, -1, 1);
      }
      if (this.#buttonsPressed(pad, this.config.strafeNegativeButtons)) {
        strafe = -1;
      } else if (this.#buttonsPressed(pad, this.config.strafePositiveButtons)) {
        strafe = 1;
      }
      if (this.#buttonsPressedOnce(pad, this.config.resetButtons)) {
        reset = true;
      }
    }

    // Keyboard overrides / fallbacks
    if (this.keys.has("w")) left = 1;
    else if (this.keys.has("s")) left = -1;

    if (this.keys.has("i")) right = 1;
    else if (this.keys.has("k")) right = -1;

    if (this.keys.has("arrowleft") || this.keys.has("a")) strafe = -1;
    else if (this.keys.has("arrowright") || this.keys.has("d")) strafe = 1;

    if (this.keys.has(" ")) {
      left = 0;
      right = 0;
      strafe = 0;
    }

    const pause = this.pauseRequested;
    this.pauseRequested = false;

    reset = reset || this.resetRequested;
    this.resetRequested = false;

    return new InputState({ left, right, strafe, resetTrail: reset, hasGamepad, paused: pause });
  }

  #scanForGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.gamepadIndex !== null && pads[this.gamepadIndex]) {
      return pads[this.gamepadIndex];
    }
    for (const pad of pads) {
      if (pad) {
        this.gamepadIndex = pad.index;
        return pad;
      }
    }
    this.gamepadIndex = null;
    return null;
  }

  #readAxis(gamepad, axisIndex, invert) {
    if (!gamepad || axisIndex == null) return 0;
    const value = gamepad.axes[axisIndex] ?? 0;
    const adjusted = invert ? -value : value;
    return Math.abs(adjusted) < this.config.deadzone ? 0 : clamp(adjusted, -1, 1);
  }

  #buttonsPressed(gamepad, indices) {
    if (!gamepad || !indices) return false;
    return indices.some((index) => {
      const button = gamepad.buttons[index];
      return Boolean(button && button.pressed);
    });
  }

  #buttonsPressedOnce(gamepad, indices) {
    if (!gamepad || !indices) return false;
    let triggered = false;
    for (const index of indices) {
      const button = gamepad.buttons[index];
      const pressed = Boolean(button && button.pressed);
      const prev = this.prevButtonStates.get(index) || false;
      if (pressed && !prev) {
        triggered = true;
      }
      this.prevButtonStates.set(index, pressed);
    }
    return triggered;
  }
}
