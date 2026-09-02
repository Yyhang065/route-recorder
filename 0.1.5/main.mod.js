import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const recorder = {
  recording: true,
  points: [],
  carOwner: null,
  scene: null,
  line: null,
  button: null,

  setButton(text) {
    if (!this.button) return;

    const icon =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
          '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
          '<circle cx="12" cy="12" r="4" fill="white"/>' +
        "</svg>"
      );

    this.button.innerHTML =
      '<img class="button-icon" src="' +
      icon +
      '"> ' +
      text;
  },

  start() {
    this.recording = true;
    this.points = [];
    this.carOwner = null;

    console.log("[Route Recorder] Recording enabled");

    this.setButton("Disable");
  },

  stop() {
    this.recording = false;
    this.carOwner = null;

    console.log("[Route Recorder] Recording disabled");

    this.setButton("Record");
  },

  finish() {
    if (!this.recording) return;

    this.recording = false;
    this.carOwner = null;

    this.setButton("Record");

    console.log(
      "[Route Recorder] Test finished. Points:",
      this.points.length
    );

    if (!this.scene || this.points.length < 2) {
      console.log("[Route Recorder] Not enough points to draw");
      return;
    }

    try {
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
          "[Route Recorder] Three.js constructors unavailable"
        );
        return;
      }

      if (this.line) {
        this.scene.remove(this.line);

        if (this.line.geometry) {
          this.line.geometry.dispose();
        }

        if (this.line.material) {
          this.line.material.dispose();
        }

        this.line = null;
      }

      const geometry = new BufferGeometry();

      geometry.setFromPoints(
        this.points.map(
          (p) => new Vector3(p.x, p.y, p.z)
        )
      );

      const material = new LineBasicMaterial({
        color: 0x00bfff,
        depthTest: false,
        depthWrite: false,
      });

      this.line = new Line(
        geometry,
        material
      );

      this.line.renderOrder = 9999;

      this.scene.add(this.line);

      console.log(
        "[Route Recorder] Route drawn successfully"
      );
    } catch (error) {
      console.error(
        "[Route Recorder] Failed to draw route:",
        error
      );
    }
  },
};

globalThis.__routeRecorder = recorder;

class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * EDITOR
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          try {
            const rr = globalThis.__routeRecorder;

            /*
             * Get the editor scene.
             */
            rr.scene = n.scene;

            /*
             * Get Three.js constructors.
             * These are only assigned here AFTER
             * the button injection point is reached.
             */
            try {
              rr.Vector3 = w.Pq0;
              rr.BufferGeometry = w.LoY;
              rr.Line = w.N1A;
              rr.LineBasicMaterial = w.mrM;
            } catch (threeError) {
              console.warn(
                "[Route Recorder] Could not get Three.js constructors",
                threeError
              );
            }

            /*
             * Create button.
             */
            if (!rr.button) {
              const button =
                document.createElement("button");

              button.className = "button";

              rr.button = button;

              button.addEventListener(
                "click",
                () => {
                  if (rr.recording) {
                    rr.stop();
                  } else {
                    rr.start();
                  }
                }
              );

              k.appendChild(button);

              rr.setButton(
                rr.recording
                  ? "Disable"
                  : "Record"
              );

              console.log(
                "[Route Recorder] Button created"
              );
            }

            /*
             * Finish when returning to editor.
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
                  args
                );
              };
            }

          } catch (error) {
            console.error(
              "[Route Recorder] Editor error:",
              error
            );
          }
        }
      `,
    });

    /*
     * SIMULATION
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,

      token: '(0, l.GG)(this, te, e, "f");',

      func: `
        {
          try {
            const rr = globalThis.__routeRecorder;

            if (
              rr &&
              rr.recording &&
              e &&
              e.position
            ) {
              if (rr.carOwner === null) {
                rr.carOwner = this;
              }

              if (rr.carOwner === this) {
                const p = e.position;

                const last =
                  rr.points[
                    rr.points.length - 1
                  ];

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
          } catch (error) {
            console.error(
              "[Route Recorder] Recording error:",
              error
            );
          }
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
