import { FIELD_WIDTH_M, FIELD_HEIGHT_M } from "./constants.js";
import { createVector } from "./utils.js";

export class Field {
  constructor(image) {
    this.image = image;
    this.pixelWidth = image.width;
    this.pixelHeight = image.height;
    this.pixelsPerMeterX = this.pixelWidth / FIELD_WIDTH_M;
    this.pixelsPerMeterY = this.pixelHeight / FIELD_HEIGHT_M;
    this.pixelsPerMeter = (this.pixelsPerMeterX + this.pixelsPerMeterY) / 2;
    this.originPx = createVector(this.pixelWidth / 2, this.pixelHeight / 2);
  }

  metersToPixels(meters) {
    return meters * this.pixelsPerMeter;
  }

  toPixels(position) {
    return createVector(
      this.originPx.x + position.x * this.pixelsPerMeter,
      this.originPx.y - position.y * this.pixelsPerMeter
    );
  }

  draw(ctx) {
    ctx.drawImage(this.image, 0, 0, this.pixelWidth, this.pixelHeight);
  }
}

export function loadField(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(new Field(image));
    image.onerror = (event) => reject(new Error(`Failed to load field image: ${path}`));
    image.src = path;
  });
}
