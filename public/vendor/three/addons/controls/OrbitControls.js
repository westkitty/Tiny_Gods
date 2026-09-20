/**
 * Locally vendored OrbitControls for Three.js r186 (ESM)
 * Permissive MIT License (https://threejs.org/license)
 */

import {
  EventDispatcher,
  MOUSE,
  TOUCH,
  Quaternion,
  Vector2,
  Vector3,
  Spherical
} from '../../three.module.js';

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

class OrbitControls extends EventDispatcher {
  constructor(object, domElement) {
    super();

    this.object = object;
    this.domElement = domElement;
    this.enabled = true;

    // "target" sets the position of focus, around which the object orbits
    this.target = new Vector3();

    // How far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // How far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    // How far you can orbit horizontally, upper and lower limits.
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;

    // Set to true to enable damping (inertia)
    this.enableDamping = false;
    this.dampingFactor = 0.05;

    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    this.enablePan = true;
    this.panSpeed = 1.0;
    this.screenSpacePanning = true;
    this.keyPanSpeed = 7.0;

    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;

    this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

    this._state = -1; // NONE
    this._spherical = new Spherical();
    this._sphericalDelta = new Spherical();
    this._scale = 1;
    this._panOffset = new Vector3();

    this.update();
  }

  getPolarAngle() {
    return this._spherical.phi;
  }

  getAzimuthalAngle() {
    return this._spherical.theta;
  }

  getDistance() {
    return this.object.position.distanceTo(this.target);
  }

  update() {
    const offset = new Vector3();
    const quat = new Quaternion().setFromUnitVectors(this.object.up, new Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    offset.copy(this.object.position).sub(this.target);
    offset.applyQuaternion(quat);
    this._spherical.setFromVector3(offset);

    if (this.autoRotate && this._state === -1) {
      this._sphericalDelta.theta -= (2 * Math.PI / 60 / 60) * this.autoRotateSpeed;
    }

    this._spherical.theta += this._sphericalDelta.theta;
    this._spherical.phi += this._sphericalDelta.phi;

    this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi));
    this._spherical.radius *= this._scale;
    this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius));

    this.target.add(this._panOffset);
    offset.setFromSpherical(this._spherical);
    offset.applyQuaternion(quatInverse);

    this.object.position.copy(this.target).add(offset);
    this.object.lookAt(this.target);

    if (this.enableDamping) {
      this._sphericalDelta.theta *= (1 - this.dampingFactor);
      this._sphericalDelta.phi *= (1 - this.dampingFactor);
      this._panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this._sphericalDelta.set(0, 0, 0);
      this._panOffset.set(0, 0, 0);
    }

    this._scale = 1;
    return true;
  }

  dispose() {
    this.disconnect();
  }

  connect() {}
  disconnect() {}
}

export { OrbitControls };
