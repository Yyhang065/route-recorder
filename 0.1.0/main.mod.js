import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {
    globalThis.__routeRecorder = {
      enabled: true,
      recording: false,
      points: [],
      line: null,
      scene: null,
      three: null,

      clear() {
        this.recording = false;
        this.points.length = 0;

        if (this.line && this.scene) {
          this.scene.remove(this.line);
          this.line.geometry?.dispose();
          this.line.material?.dispose();
        }
        this.line = null;
      },

      draw() {
        if (!this.scene || !this.three || this.points.length < 2) return;

        if (this.line) {
          this.scene.remove(this.line);
          this.line.geometry?.dispose();
          this.line.material?.dispose();
          this.line = null;
        }

        const geometry = new this.three.LoY().setFromPoints(
          this.points.map(
            (p) => new this.three.Pq0(p.x, p.y, p.z)
          )
        );

        const material = new this.three.mrM({
          color: 0x00bfff,
          linewidth: 2,
        });

        this.line = new this.three.N1A(geometry, material);
        this.line.renderOrder = 999;
        this.scene.add(this.line);
      },
    };

    // PolyTrack 0.6.2 editor = webpack chunk 112.
    // Add our button immediately after the existing Help button.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "k.appendChild(C));",
      func: `
        {
          const rr = globalThis.__routeRecorder;
          const recordButton = document.createElement("button");
          recordButton.className = "button";
          recordButton.textContent = rr.enabled
            ? "Record Next Run"
            : "Don't Record Next Run";

          recordButton.addEventListener("click", () => {
            (0, i.gn)(this, Ft, "f").playUIClick();

            rr.enabled = !rr.enabled;

            recordButton.textContent = rr.enabled
              ? "Record Next Run"
              : "Don't Record Next Run";
          });

          k.appendChild(recordButton);
        }
      `,
    });

    // Keep the editor's actual Three.js scene and module namespace.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "constructor(t, e, n, s, o, a, r, h, l, c, d, g, f, p) {",
      func: `
        globalThis.__routeRecorder.scene = n.scene;
        globalThis.__routeRecorder.three = w;
      `,
    });

    // The editor's Hn() function is called when Test is actually started.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "Hn = function () {",
      func: `
        if (globalThis.__routeRecorder.enabled) {
          globalThis.__routeRecorder.clear();
          globalThis.__routeRecorder.recording = true;
        }
      `,
    });

    // When the editor becomes active again, finish and display the route.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "enable() {",
      func: `
        {
          const rr = globalThis.__routeRecorder;
          if (rr.points.length > 1) {
            rr.recording = false;
            rr.draw();
          }
        }
      `,
    });

    // Main-bundle simulation-state pipeline.
    // This receives decoded carState objects, including position.x/y/z.
    pml.registerGlobalMixin({
      type: MixinType.INSERT,
      token: "i(m.VO(e.subarray(4)).carState);",
      func: `
        {
          const rr = globalThis.__routeRecorder;
          const state = m.VO(e.subarray(4)).carState;

          if (rr?.recording && state?.position && state.frames % 2 === 0) {
            const p = state.position;
            const last = rr.points[rr.points.length - 1];

            if (
              !last ||
              (p.x - last.x) ** 2 +
                (p.y - last.y) ** 2 +
                (p.z - last.z) ** 2 > 0.0025
            ) {
              rr.points.push({
                x: p.x,
                y: p.y,
                z: p.z,
              });
            }

            if (state.finishFrames != null) {
              rr.recording = false;
            }
          }
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
