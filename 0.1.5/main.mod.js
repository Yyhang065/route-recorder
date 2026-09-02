import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const recorder = {
  recording: false,
  points: [],
  carOwner: null,
  scene: null,
  line: null,
  button: null,

  start() {
    this.recording = true;
    this.points = [];
    this.carOwner = null;

    this.clearLine();

    if (this.button) {
      this.setButton("Disable");
    }

    console.log("[Route Recorder] Recording enabled");
  },

  stop() {
    this.recording = false;
    this.carOwner = null;

    if (this.button) {
      this.setButton("Record");
    }

    console.log("[Route Recorder] Recording disabled");
  },

  setButton(text) {
    if (!this.button) return;

    this.button.innerHTML =
      '<img class="button-icon" src="data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
        '<circle cx="12" cy="12" r="4" fill="white"/>' +
        "</svg>",
      ) +
      '"> ' +
      text;
  },

  clearLine() {
    if (!this.line || !this.scene) {
      this.line = null;
      return;
    }

    this.scene.remove(this.line);

    if (this.line.geometry) {
      this.line.geometry.dispose();
    }

    if (this.line.material) {
      this.line.material.dispose();
    }

    this.line = null;
  },

  finish() {
    if (!this.recording) return;

    this.recording = false;
    this.carOwner = null;

    if (this.button) {
      this.setButton("Record");
    }

    if (
      !this.scene ||
      this.points.length < 2
    ) {
      console.log(
        "[Route Recorder] Not enough points recorded",
      );
      return;
    }

    const Vector3 = this.Vector3;
    const BufferGeometry = this.BufferGeometry;
    const LineBasicMaterial = this.LineBasicMaterial;
    const Line = this.Line;

    if (
      !Vector3 ||
      !BufferGeometry ||
      !LineBasicMaterial ||
      !Line
    ) {
      console.error(
        "[Route Recorder] Three.js constructors unavailable",
      );
      return;
    }

    this.clearLine();

    const geometry = new BufferGeometry();

    geometry.setFromPoints(
      this.points.map(
        (p) => new Vector3(p.x, p.y, p.z),
      ),
    );

    const material = new LineBasicMaterial({
      color: 0x00bfff,
    });

    this.line = new Line(
      geometry,
      material,
    );

    this.line.renderOrder = 9999;

    this.scene.add(this.line);

    console.log(
      "[Route Recorder] Route drawn:",
      this.points.length,
      "points",
    );
  },
};

globalThis.__routeRecorder = recorder;

class RouteRecorder extends PolyMod {
  init = (pml) => {
    /*
     * EDITOR
     *
     * This is the exact injection point we already
     * proved works in 0.1.3.
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr = globalThis.__routeRecorder;

          rr.scene = n.scene;

          /*
           * PolyTrack's editor module imports Three.js
           * as "w", so use the actual constructors.
           */
          rr.Vector3 = w.Pq0;
          rr.BufferGeometry = w.LoY;
          rr.Line = w.N1A;
          rr.LineBasicMaterial = w.mrM;

          /*
           * Create the button.
           */
          if (!rr.button) {
            const button =
              document.createElement("button");

            button.className = "button";

            rr.button = button;

            rr.setButton("Record");

            button.addEventListener(
              "click",
              () => {
                if (rr.recording) {
                  rr.stop();
                } else {
                  rr.start();
                }
              },
            );

            k.appendChild(button);
          }

          /*
           * When PolyTrack returns to the editor,
           * finish the recording and draw the route.
           */
          if (!this.__routeRecorderPatched) {
            this.__routeRecorderPatched = true;

            const originalEnable = this.enable;

            this.enable = function (...args) {
              rr.scene = n.scene;

              if (rr.recording) {
                rr.finish();
              }

              return originalEnable.apply(
                this,
                args,
              );
            };
          }
        }
      `,
    });

    /*
     * SIMULATION
     *
     * Capture the car's position whenever its
     * simulation state is updated.
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,

      token: '(0, l.GG)(this, te, e, "f");',

      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (
            rr &&
            rr.recording &&
            e &&
            e.position
          ) {
            /*
             * Remember the first simulation object
             * that provides a car position.
             */
            if (rr.carOwner === null) {
              rr.carOwner = this;
            }

            if (rr.carOwner === this) {
              const p = e.position;

              const last =
                rr.points[
                  rr.points.length - 1
                ];

              /*
               * Don't record thousands of identical
               * positions. Add a point only after the
               * car has moved a small distance.
               */
              if (
                !last ||
                Math.pow(p.x - last.x, 2) +
                  Math.pow(p.y - last.y, 2) +
                  Math.pow(p.z - last.z, 2) >
                  0.0025
              ) {
                rr.points.push({
                  x: p.x,
                  y: p.y,
                  z: p.z,
                });
              }
            }
          }
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
