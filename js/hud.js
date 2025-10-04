export class HUD {
	constructor() {
		this.wheelEl = document.getElementById("wheel-speed");
		this.strafeEl = document.getElementById("strafe-speed");
		this.poseEl = document.getElementById("pose");
		this.inputEl = document.getElementById("input-status");
		this.fpsEl = document.getElementById("fps");
		this._fpsSmoothing = 0;
	}

	update({ leftSpeed, rightSpeed, strafeSpeed, pose, hasGamepad, fps }) {
		if (this.wheelEl) {
			this.wheelEl.textContent = `${leftSpeed.toFixed(2)} / ${rightSpeed.toFixed(2)} m/s`;
		}
		if (this.strafeEl) {
			this.strafeEl.textContent = `${strafeSpeed.toFixed(2)} m/s`;
		}
		if (this.poseEl) {
			const degrees = pose.heading * (180 / Math.PI);
			this.poseEl.textContent = `(${pose.position.x.toFixed(2)}, ${pose.position.y.toFixed(2)}) m @ ${degrees.toFixed(1)}°`;
		}
		if (this.inputEl) {
			this.inputEl.textContent = hasGamepad ? "Gamepad" : "Keyboard";
		}
		if (this.fpsEl && typeof fps === "number") {
			// simple exponential smoothing for readability
			this._fpsSmoothing = this._fpsSmoothing * 0.8 + fps * 0.2;
			this.fpsEl.textContent = this._fpsSmoothing.toFixed(0);
		}
	}
}