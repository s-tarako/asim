import {
  ACCELERATION_TIME_S,
  FIELD_HEIGHT_M,
  FIELD_WIDTH_M,
  MAX_TRAIL_POINTS,
  MAX_WHEEL_SPEED_MPS,
  ROBOT_LENGTH_M,
  ROBOT_WIDTH_M,
  STRAFE_SPEED_MPS,
  TRAIL_POINT_MAX_INTERVAL_S,
  TRAIL_POINT_SPACING_M,
} from "./constants.js";
import { clamp, createVector, copyVector, normalizeAngle, vectorDistance } from "./utils.js";

export class WheelCommand {
  constructor(left = 0, right = 0) {
    this.left = left;
    this.right = right;
  }

  static fromNormalized(left, right) {
    return new WheelCommand(left * MAX_WHEEL_SPEED_MPS, right * MAX_WHEEL_SPEED_MPS);
  }
}

export class RobotState {
  constructor() {
    this.position = createVector(0, 0);
    this.heading = -Math.PI / 2;
  }
}

export class DifferentialDriveRobot {
  constructor() {
    this.state = new RobotState();
    this.trackWidth = ROBOT_WIDTH_M;
    this.bodyLength = ROBOT_LENGTH_M;
    this.maxSpeed = MAX_WHEEL_SPEED_MPS;
    this.maxAcceleration = this.maxSpeed / ACCELERATION_TIME_S;
    this.maxStrafeSpeed = STRAFE_SPEED_MPS;
    this._leftSpeed = 0;
    this._rightSpeed = 0;
    this._lastStrafeSpeed = 0;
    this._outlineLocal = this.#buildOutline();
    this._casterLocal = createVector(-this.bodyLength / 2, 0);
    this._trail = [];
    this._trail.push(copyVector(this.state.position));
    this._trailDistanceAccum = 0;
    this._trailTimeAccum = 0;
  }

  #buildOutline() {
    const stemWidth = this.trackWidth * 0.3;
    const halfWidth = this.trackWidth / 2;
    const halfLength = this.bodyLength / 2;
    const stemBack = -halfLength;
    const stemFront = halfLength * 0.6;
    const barFront = halfLength;
    return [
      createVector(barFront, halfWidth),
      createVector(barFront, -halfWidth),
      createVector(stemFront, -halfWidth),
      createVector(stemFront, -stemWidth),
      createVector(stemBack, -stemWidth),
      createVector(stemBack, stemWidth),
      createVector(stemFront, stemWidth),
      createVector(stemFront, halfWidth),
    ];
  }

  update(command, dt, { strafe = 0 } = {}) {
    const prevPosition = copyVector(this.state.position);
    const targetLeft = clamp(command.left, -this.maxSpeed, this.maxSpeed);
    const targetRight = clamp(command.right, -this.maxSpeed, this.maxSpeed);

    this._leftSpeed = this.#approach(this._leftSpeed, targetLeft, dt);
    this._rightSpeed = this.#approach(this._rightSpeed, targetRight, dt);

    const linearSpeed = (this._rightSpeed + this._leftSpeed) / 2;
    const angularSpeed = (this._rightSpeed - this._leftSpeed) / this.trackWidth;

    let dx;
    let dy;
    let newHeading;

    if (Math.abs(angularSpeed) < 1e-6) {
      dx = linearSpeed * Math.cos(this.state.heading) * dt;
      dy = linearSpeed * Math.sin(this.state.heading) * dt;
      newHeading = this.state.heading + angularSpeed * dt;
    } else {
      const radius = linearSpeed / angularSpeed;
      const dtheta = angularSpeed * dt;
      const cx = this.state.position.x - radius * Math.sin(this.state.heading);
      const cy = this.state.position.y + radius * Math.cos(this.state.heading);
      newHeading = this.state.heading + dtheta;
      const newX = cx + radius * Math.sin(newHeading);
      const newY = cy - radius * Math.cos(newHeading);
      dx = newX - this.state.position.x;
      dy = newY - this.state.position.y;
    }

    const limitedStrafe = clamp(strafe, -1, 1);
    const lateralSpeed = limitedStrafe * this.maxStrafeSpeed;
    this._lastStrafeSpeed = lateralSpeed;
    if (Math.abs(lateralSpeed) > 1e-9) {
      const sinH = Math.sin(this.state.heading);
      const cosH = Math.cos(this.state.heading);
      const rightX = sinH;
      const rightY = -cosH;
      dx += rightX * lateralSpeed * dt;
      dy += rightY * lateralSpeed * dt;
    }

    this.state.position.x += dx;
    this.state.position.y += dy;
    this.state.heading = normalizeAngle(newHeading);

    this.#clampWithinField();
    const distanceTravelled = vectorDistance(prevPosition, this.state.position);
    this.#recordTrail(distanceTravelled, dt);
  }

  resetTrail() {
    this._trail.length = 0;
    this._trail.push(copyVector(this.state.position));
    this._trailDistanceAccum = 0;
    this._trailTimeAccum = 0;
  }

  trail() {
    return this._trail;
  }

  bodyOutlineWorld() {
    const cosH = Math.cos(this.state.heading);
    const sinH = Math.sin(this.state.heading);
    return this._outlineLocal.map((local) =>
      createVector(
        this.state.position.x + local.x * cosH - local.y * sinH,
        this.state.position.y + local.x * sinH + local.y * cosH
      )
    );
  }

  casterWheelPosition() {
    const cosH = Math.cos(this.state.heading);
    const sinH = Math.sin(this.state.heading);
    return createVector(
      this.state.position.x + this._casterLocal.x * cosH - this._casterLocal.y * sinH,
      this.state.position.y + this._casterLocal.x * sinH + this._casterLocal.y * cosH
    );
  }

  get wheelSpeeds() {
    return [this._leftSpeed, this._rightSpeed];
  }

  get strafeSpeed() {
    return this._lastStrafeSpeed;
  }

  #approach(current, target, dt) {
    const maxDelta = this.maxAcceleration * dt;
    if (current < target) {
      return Math.min(target, current + maxDelta);
    }
    return Math.max(target, current - maxDelta);
  }

  #clampWithinField() {
    const halfWidth = FIELD_WIDTH_M / 2;
    const halfHeight = FIELD_HEIGHT_M / 2;
    const marginX = this.bodyLength / 2;
    const marginY = this.trackWidth / 2;
    this.state.position.x = clamp(this.state.position.x, -halfWidth + marginX, halfWidth - marginX);
    this.state.position.y = clamp(this.state.position.y, -halfHeight + marginY, halfHeight - marginY);
  }

  #recordTrail(distanceTravelled, dt) {
    const last = this._trail[this._trail.length - 1];
    this._trailDistanceAccum += distanceTravelled;
    this._trailTimeAccum += dt;
    if (
      this._trailDistanceAccum >= TRAIL_POINT_SPACING_M ||
      this._trailTimeAccum >= TRAIL_POINT_MAX_INTERVAL_S ||
      !last
    ) {
      this._trail.push(copyVector(this.state.position));
      if (this._trail.length > MAX_TRAIL_POINTS) {
        this._trail.shift();
      }
      this._trailDistanceAccum = 0;
      this._trailTimeAccum = 0;
    } else {
      last.x = this.state.position.x;
      last.y = this.state.position.y;
    }
  }
}
