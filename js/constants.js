export const FIELD_WIDTH_M = 5.0;
export const FIELD_HEIGHT_M = 10.0;
export const ROBOT_WIDTH_M = 0.7;
export const ROBOT_LENGTH_M = 1.0;
export const MAX_WHEEL_SPEED_MPS = 2.7;
export const ACCELERATION_TIME_S = 0.5;
export const STRAFE_SPEED_MPS = 0.5;
export const MAX_TRAIL_POINTS = 2048;
export const TRAIL_POINT_SPACING_M = 0.005;
export const TRAIL_POINT_MAX_INTERVAL_S = 0.06;
export const DEADZONE = 0.08;

export const GAMEPAD_CONFIG = {
  leftAxis: 1,
  rightAxis: 3,
  strafeAxis: 6,
  invertAxes: true,
  deadzone: DEADZONE,
  resetButtons: [9],
  strafeNegativeButtons: [14],
  strafePositiveButtons: [15],
};

export const DEFAULT_FIELD_IMAGE = "sample_field.png";
