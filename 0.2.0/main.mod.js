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

  Vector3: null,
  BufferGeometry: null,
  Line: null,
  LineBasicMaterial: null,

  button: null,

  updateButton() {
    if (!this.button) return;

    const icon =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
          '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
          '<circle cx="12" cy="12" r="4" fill="white"/>' +
        "</svg>"
      );

    const text = this.recording
      ? "Recording " + this.points.length
      : "Show Route " + this.points.length;

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

    this.clearLine();
    this.updateButton();

    console.log("[Route Recorder] Recording started");
  },

  stop() {
    this.recording = false;
    this.carOwner = null;

    this.updateButton();

    console.log(
      "[Route Recorder] Recording stopped:",
      this.points.length,
      "points"
    );
  },

  addPoint(position) {
    if (!position) return;

    const last = this.points[this.points.length - 1];

    if (
      !last ||
      Math.pow(position.x - last.x, 2) +
        Math.pow(position.y - last.y, 2) +
        Math.pow(position.z - last.z, 2) >
        0.0025
    ) {
      this.points.push({
        x: position.x,
        y: position.y,
        z: position.z,
      });

      this.updateButton();
    }
  },

  clearLine() {
    if (this.line && this.scene) {
      this.scene.remove(this.line);

      if (this.line.geometry) {
        this.line.geometry.dispose();
      }

      if (this.line.material) {
        this.line.material.dispose();
      }
    }

    this.line = null;
  },

  drawRoute() {
    console.log(
      "[Route Recorder] Drawing",
      this.points.length,
      "points"
    );

    if (!this.scene) {
      console.warn("[Route Recorder] No scene");
      return;
    }

    if (this.points.length < 2) {
      console.warn(
        "[Route Recorder] Not enough points"
      );
      return;
    }

    if (
      !this.Vector3 ||
      !this.BufferGeometry ||
      !this.Line ||
      !this.LineBasicMaterial
    ) {
      console.error(
        "[Route Recorder] Three.js unavailable"
      );
      return;
    }

    try {
      this.clearLine();

      const geometry =
        new this.BufferGeometry();

      geometry.setFromPoints(
        this.points.map(
          (p) =>
            new this.Vector3(
              p.x,
              p.y,
              p.z
            )
        )
      );

      const material =
        new this.LineBasicMaterial({
          color: 0x00bfff,
          depthTest: false,
          depthWrite: false,
        });

      this.line = new this.Line(
        geometry,
        material
      );

      this.line.renderOrder = 9999;

      this.scene.add(this.line);

      console.log(
        "[Route Recorder] ROUTE DRAWN:",
        this.points.length,
        "points"
      );
    } catch (error) {
      console.error(
        "[Route Recorder] Draw error:",
        error
      );
    }
  },
};

globalThis.__routeRecorder = recorder;

class RouteRecorder extends PolyMod {
  init = (pml) => {
    /*
     * EDITOR BUTTON
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr =
            globalThis.__routeRecorder;

          /*
           * Get the editor scene safely.
           */
          try {
            rr.scene = n.scene;
          } catch (error) {
            console.warn(
              "[Route Recorder] Scene unavailable",
              error
            );
          }

          /*
           * Get Three.js constructors.
           */
          try {
            rr.Vector3 = w.Pq0;
            rr.BufferGeometry = w.LoY;
            rr.Line = w.N1A;
            rr.LineBasicMaterial = w.mrM;
          } catch (error) {
            console.warn(
              "[Route Recorder] Three.js unavailable",
              error
            );
          }

          /*
           * Create the button.
           */
          if (!rr.button) {
            const button =
              document.createElement("button");

            button.className = "button";
            rr.button = button;

            button.addEventListener(
              "click",
              () => {
                /*
                 * Stop recording and show
                 * the recorded route.
                 */
                if (rr.recording) {
                  rr.stop();

                  try {
                    rr.scene = n.scene;
                  } catch (error) {
                    console.warn(
                      "[Route Recorder] Scene unavailable",
                      error
                    );
                  }

                  rr.drawRoute();
                  return;
                }

                /*
                 * Start a new recording.
                 */
                rr.start();
              }
            );

            k.appendChild(button);

            rr.updateButton();

            console.log(
              "[Route Recorder] BUTTON CREATED"
            );
          }
        }
      `,
    });

    /*
     * CAR POSITION RECORDING
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,

      token: '(0, l.GG)(this, te, e, "f");',

      func: `
        {
          try {
            const rr =
              globalThis.__routeRecorder;

            if (
              rr &&
              rr.recording &&
              e &&
              e.position
            ) {
              if (rr.carOwner === null) {
                rr.carOwner = this;
              }

              if (
                rr.carOwner === this
              ) {
                rr.addPoint(
                  e.position
                );
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

export let polyMod =
  new RouteRecorder();
