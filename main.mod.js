import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const state = {
  enabled: true,
  recording: false,
  points: [],
  carOwner: null,
  line: null,
  scene: null,
  Vector3: null,
  BufferGeometry: null,
  LineBasicMaterial: null,
  Line: null,
  button: null,
};

function removeRoute() {
  state.recording = false;
  state.carOwner = null;

  if (state.line && state.scene) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
  }

  state.line = null;
  state.points.length = 0;
}

function finishRecording() {
  if (!state.recording) return;

  state.recording = false;
  state.carOwner = null;

  if (
    !state.scene ||
    !state.Vector3 ||
    !state.BufferGeometry ||
    !state.LineBasicMaterial ||
    !state.Line ||
    state.points.length < 2
  ) {
    return;
  }

  if (state.line) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
  }

  const geometry = new state.BufferGeometry().setFromPoints(
    state.points.map(
      (p) => new state.Vector3(p.x, p.y, p.z)
    ),
  );

  const material = new state.LineBasicMaterial({
    color: 0x00bfff,
    depthTest: false,
    depthWrite: false,
  });

  const line = new state.Line(geometry, material);
  line.renderOrder = 9999;

  state.line = line;
  state.scene.add(line);
}

class RouteRecorder extends PolyMod {
  init = (pml) => {
    /*
     * The editor is webpack chunk 112 in PolyTrack 0.6.2.
     *
     * Instead of hard-coding minified Three.js export names such as
     * "LoY", "Pq0", "mrM", or "N1A", discover the actual Three.js
     * constructors from their standard runtime prototype flags.
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: 'n.scene.add((0, i.gn)(this, qe, "f")),',
      func: `
        {
          const values = Object.values(w);

          globalThis.__routeRecorder.scene = n.scene;
          globalThis.__routeRecorder.Vector3 =
            values.find((v) => v?.prototype?.isVector3);
          globalThis.__routeRecorder.BufferGeometry =
            values.find((v) => v?.prototype?.isBufferGeometry);
          globalThis.__routeRecorder.LineBasicMaterial =
            values.find((v) => v?.prototype?.isLineBasicMaterial);
          globalThis.__routeRecorder.Line =
            values.find((v) => v?.prototype?.isLine);
          globalThis.__routeRecorder.camera =
            (0, i.gn)(this, qe, "f");
        }
      `,
    });

    // Insert our button immediately after PolyTrack's Help button.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "k.appendChild(C));",
      func: `
        {
          const rr = globalThis.__routeRecorder;
          const button = document.createElement("button");

          button.className = "button";
          button.textContent = rr.enabled
            ? "Record Next Run"
            : "Don't Record Next Run";
          button.title = "Record the car path during the next test run";

          button.addEventListener("click", () => {
            rr.enabled = !rr.enabled;
            button.textContent = rr.enabled
              ? "Record Next Run"
              : "Don't Record Next Run";
          });

          rr.button = button;
          k.appendChild(button);
        }
      `,
    });

    // Hn() is the editor's actual Test action.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "(Hn = function () {",
      func: `
        if (globalThis.__routeRecorder.enabled) {
          globalThis.__routeRecorder.recording = true;
          globalThis.__routeRecorder.carOwner = null;
          globalThis.__routeRecorder.points.length = 0;

          if (globalThis.__routeRecorder.line &&
              globalThis.__routeRecorder.scene) {
            globalThis.__routeRecorder.scene.remove(
              globalThis.__routeRecorder.line
            );
            globalThis.__routeRecorder.line.geometry?.dispose();
            globalThis.__routeRecorder.line.material?.dispose();
            globalThis.__routeRecorder.line = null;
          }
        }
      `,
    });

    // enable() is called again when the editor returns from the test.
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "enable() {",
      func: `
        if (globalThis.__routeRecorder.recording) {
          globalThis.__routeRecorder.recording = false;
          globalThis.__routeRecorder.carOwner = null;
          globalThis.__routeRecorder.finishRecording();
        }
      `,
    });

    // Receive the already-decoded 0.6.2 car state.
    //
    // This token occurs exactly once in main.bundle.js, inside the
    // simulation manager's setCarState(e, t) method.
    pml.registerGlobalMixin({
      type: MixinType.INSERT,
      token: '(0, l.GG)(this, te, e, "f");',
      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (rr?.recording && e?.position) {
            if (rr.carOwner === null) {
              rr.carOwner = this;
            }

            if (rr.carOwner === this) {
              const p = e.position;
              const last = rr.points[rr.points.length - 1];

              // Ignore extremely tiny movements to keep the route lightweight.
              if (
                !last ||
                (p.x - last.x) ** 2 +
                  (p.y - last.y) ** 2 +
                  (p.z - last.z) ** 2 >
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

globalThis.__routeRecorder = state;
export let polyMod = new RouteRecorder();
