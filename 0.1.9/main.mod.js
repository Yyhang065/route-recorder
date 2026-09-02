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

    console.log("[Route Recorder] Recording stopped");
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
      "[Route Recorder] Attempting to draw",
      this.points.length,
      "points"
    );

    if (!this.scene) {
      console.warn("[Route Recorder] No editor scene");
      return;
    }

    if (this.points.length < 2) {
      console.warn("[Route Recorder] Need at least 2 points to render line");
      return;
    }

    if (
      !this.Vector3 ||
      !this.BufferGeometry ||
      !this.Line ||
      !this.LineBasicMaterial
    ) {
      console.error("[Route Recorder] Three.js constructors unavailable");
      return;
    }

    try {
      this.clearLine();

      const geometry = new this.BufferGeometry();

      geometry.setFromPoints(
        this.points.map((p) => new this.Vector3(p.x, p.y, p.z))
      );

      const material = new this.LineBasicMaterial({
        color: 0x00bfff,
        depthTest: false,
        depthWrite: false,
      });

      this.line = new this.Line(geometry, material);
      this.line.renderOrder = 9999;

      this.scene.add(this.line);

      console.log(
        "[Route Recorder] ROUTE DRAWN:",
        this.points.length,
        "points"
      );
    } catch (error) {
      console.error("[Route Recorder] Draw error:", error);
    }
  },
};

globalThis.__routeRecorder = recorder;

class RouteRecorder extends PolyMod {
  init = (pml) => {
    /*
     * =========================
     * EDITOR TOOLBAR INJECTION
     * =========================
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "k.appendChild(C));",
      func: `
        {
          const rr = globalThis.__routeRecorder;

          // Update reference to editor scene
          try {
            if (typeof n !== "undefined" && n && n.scene) {
              rr.scene = n.scene;
            }
          } catch (error) {
            console.warn("[Route Recorder] Scene hook error:", error);
          }

          // Resolve Three.js constructors
          try {
            if (typeof w !== "undefined" && w) {
              rr.Vector3 = rr.Vector3 || w.Pq0 || w.Vector3;
              rr.BufferGeometry = rr.BufferGeometry || w.LoY || w.BufferGeometry;
              rr.Line = rr.Line || w.N1A || w.eaF || w.Line;
              rr.LineBasicMaterial = rr.LineBasicMaterial || w.mrM || w.V9B || w.LineBasicMaterial;
            }
          } catch (error) {
            console.warn("[Route Recorder] Three.js resolution warning:", error);
          }

          // Ensure the button element exists
          if (!rr.button) {
            const btn = document.createElement("button");
            btn.className = "button";

            btn.addEventListener("click", () => {
              if (rr.recording) {
                rr.stop();
                return;
              }

              if (typeof n !== "undefined" && n && n.scene) {
                rr.scene = n.scene;
              }
              rr.drawRoute();
            });

            rr.button = btn;
          }

          // Force append the button into current toolbar 'k'
          if (typeof k !== "undefined" && k && !k.contains(rr.button)) {
            k.appendChild(rr.button);
            rr.updateButton();
          }

          // Hook into editor enable to auto-render route when returning from test run
          if (!this.__routeRecorderPatched) {
            this.__routeRecorderPatched = true;
            const originalEnable = this.enable;

            this.enable = function (...args) {
              if (typeof n !== "undefined" && n && n.scene) {
                rr.scene = n.scene;
              }

              if (rr.recording) {
                rr.recording = false;
                rr.carOwner = null;
                rr.updateButton();
                rr.drawRoute();
              }

              // Re-mount button if toolbar container 'k' was recreated during transition
              if (typeof k !== "undefined" && k && rr.button && !k.contains(rr.button)) {
                k.appendChild(rr.button);
                rr.updateButton();
              }

              return originalEnable ? originalEnable.apply(this, args) : undefined;
            };
          }
        }
      `,
    });

    /*
     * =========================
     * CAR POSITION RECORDING
     * =========================
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,
      token: '(0, l.GG)(this, te, e, "f");',
      func: `
        {
          try {
            const rr = globalThis.__routeRecorder;
            if (rr && rr.recording && e && e.position) {
              if (rr.carOwner === null) {
                rr.carOwner = this;
              }

              if (rr.carOwner === this) {
                rr.addPoint(e.position);
              }
            }
          } catch (error) {
            console.error("[Route Recorder] Recording hook error:", error);
          }
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
