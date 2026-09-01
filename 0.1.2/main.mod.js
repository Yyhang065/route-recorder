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
  editor: null,
};

function clearLine() {
  if (state.line && state.scene) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
  }
  state.line = null;
}

function startRecording() {
  state.recording = true;
  state.carOwner = null;
  state.points.length = 0;
  clearLine();
  if (state.button) state.button.textContent = "Don't Record Next Run";
}

function cancelRecording() {
  state.recording = false;
  state.carOwner = null;
  state.points.length = 0;
  if (state.button) state.button.textContent = "Record Next Run";
}

function finishRecording() {
  if (!state.recording) return;

  state.recording = false;
  state.carOwner = null;

  if (state.button) state.button.textContent = "Record Next Run";

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

  clearLine();

  const geometry = new state.BufferGeometry().setFromPoints(
    state.points.map((p) => new state.Vector3(p.x, p.y, p.z)),
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

function installEditor(editor, container, threeExports) {
  if (state.editor === editor) return;
  state.editor = editor;
  state.scene = editor?.constructor ? state.scene : state.scene;

  const values = Object.values(threeExports || {});
  state.Vector3 = values.find((v) => v?.prototype?.isVector3) || state.Vector3;
  state.BufferGeometry = values.find((v) => v?.prototype?.isBufferGeometry) || state.BufferGeometry;
  state.LineBasicMaterial = values.find((v) => v?.prototype?.isLineBasicMaterial) || state.LineBasicMaterial;
  state.Line = values.find((v) => v?.prototype?.isLine) || state.Line;

  const button = document.createElement("button");
  button.className = "button";
  button.textContent = "Record Next Run";
  button.title = "Record the car path during the next test run";
  button.addEventListener("click", () => {
    if (state.recording) {
      cancelRecording();
    } else {
      startRecording();
    }
  });
  state.button = button;
  container.appendChild(button);

  const originalEnable = editor.enable;
  if (typeof originalEnable === "function" && !editor.__routeRecorderEnablePatched) {
    editor.__routeRecorderEnablePatched = true;
    editor.enable = function (...args) {
      if (state.recording) finishRecording();
      return originalEnable.apply(this, args);
    };
  }
}

class RouteRecorder extends PolyMod {
  init = (pml) => {
    // One chunk mixin only: PML 0.6.x reapplies the original chunk for each
    // separately registered chunk mixin, so multiple mixins on chunk 112 can
    // overwrite one another. Everything editor-side is therefore installed
    // from this single injection point.
    pml.registerChunkMixin("112.bundle.js", {
      type: MixinType.INSERT,
      token: 'n.scene.add((0, i.gn)(this, qe, "f")),',
      func: `
        {
          const rr = globalThis.__routeRecorder;
          rr.scene = n.scene;

          const values = Object.values(w);
          rr.Vector3 = values.find((v) => v?.prototype?.isVector3) || rr.Vector3;
          rr.BufferGeometry = values.find((v) => v?.prototype?.isBufferGeometry) || rr.BufferGeometry;
          rr.LineBasicMaterial = values.find((v) => v?.prototype?.isLineBasicMaterial) || rr.LineBasicMaterial;
          rr.Line = values.find((v) => v?.prototype?.isLine) || rr.Line;

          if (!rr.button && typeof k?.appendChild === "function") {
            const button = document.createElement("button");
            button.className = "button";
            button.textContent = "Record Next Run";
            button.title = "Record the car path during the next test run";
            button.addEventListener("click", () => {
              if (rr.recording) {
                rr.recording = false;
                rr.carOwner = null;
                rr.points.length = 0;
                button.textContent = "Record Next Run";
              } else {
                rr.recording = true;
                rr.carOwner = null;
                rr.points.length = 0;
                if (rr.line && rr.scene) {
                  rr.scene.remove(rr.line);
                  rr.line.geometry?.dispose();
                  rr.line.material?.dispose();
                  rr.line = null;
                }
                button.textContent = "Don't Record Next Run";
              }
            });
            rr.button = button;
            k.appendChild(button);
          }

          if (!this.__routeRecorderEnablePatched && typeof this.enable === "function") {
            const originalEnable = this.enable;
            this.__routeRecorderEnablePatched = true;
            this.enable = function (...args) {
              if (globalThis.__routeRecorder.recording) {
                globalThis.__routeRecorder.finishRecording();
              }
              return originalEnable.apply(this, args);
            };
          }
        }
      `,
    });

    // This global mixin receives the decoded car state from the simulation
    // manager and records the car's 3D position while a run is active.
    pml.registerGlobalMixin({
      type: MixinType.INSERT,
      token: '(0, l.GG)(this, te, e, "f");',
      func: `
        {
          const rr = globalThis.__routeRecorder;
          if (rr?.recording && e?.position) {
            if (rr.carOwner === null) rr.carOwner = this;
            if (rr.carOwner === this) {
              const p = e.position;
              const last = rr.points[rr.points.length - 1];
              if (
                !last ||
                (p.x - last.x) ** 2 +
                  (p.y - last.y) ** 2 +
                  (p.z - last.z) ** 2 > 0.0025
              ) {
                rr.points.push({ x: p.x, y: p.y, z: p.z });
              }
            }
          }
        }
      `,
    });
  };
}

globalThis.__routeRecorder = state;
globalThis.__routeRecorder.finishRecording = finishRecording;
globalThis.__routeRecorder.startRecording = startRecording;
globalThis.__routeRecorder.cancelRecording = cancelRecording;

export let polyMod = new RouteRecorder();
