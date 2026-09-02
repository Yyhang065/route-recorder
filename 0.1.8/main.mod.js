import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const state = {
  enabled: true,
  recording: false,
  points: [],
  line: null,
  scene: null,
  Vector3: null,
  BufferGeometry: null,
  LineBasicMaterial: null,
  Line: null,
  button: null,
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
  state.points.length = 0;
  clearLine();

  if (state.button) {
    state.button.textContent = "Don't Record Next Run";
  }
}

function cancelRecording() {
  state.recording = false;
  state.points.length = 0;

  if (state.button) {
    state.button.textContent = "Record Next Run";
  }
}

function discoverThree(values) {
  if (!Array.isArray(values)) return;

  state.Vector3 =
    values.find((v) => v?.prototype?.isVector3) ||
    state.Vector3;

  state.BufferGeometry =
    values.find((v) => v?.prototype?.isBufferGeometry) ||
    state.BufferGeometry;

  state.LineBasicMaterial =
    values.find((v) => v?.prototype?.isLineBasicMaterial) ||
    state.LineBasicMaterial;

  state.Line =
    values.find((v) => v?.prototype?.isLine) ||
    state.Line;
}

function drawRoute() {
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
    state.points.map(
      (p) => new state.Vector3(p.x, p.y, p.z)
    )
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

function finishRecording() {
  if (!state.recording) return;

  state.recording = false;

  if (state.button) {
    state.button.textContent = "Record Next Run";
  }

  drawRoute();
}

class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * EDITOR
     * Create the recording button and obtain the editor scene.
     */
    pml.registerChunkMixin("112.bundle.js", {
      type: MixinType.INSERT,

      token: 'n.scene.add((0, i.gn)(this, qe, "f")),',

      func: `
        {
          const rr = globalThis.__routeRecorder;

          rr.scene = n.scene;

          try {
            if (typeof w !== "undefined") {
              rr.discoverThree(Object.values(w));
            }
          } catch (_) {}

          if (
            !rr.button &&
            typeof k?.appendChild === "function"
          ) {
            const button = document.createElement("button");

            button.className = "button";
            button.textContent = "Record Next Run";
            button.title =
              "Record the car path during the next test run";

            button.addEventListener("click", () => {
              if (rr.recording) {
                rr.cancelRecording();
              } else {
                rr.startRecording();
              }
            });

            rr.button = button;

            k.appendChild(button);
          }

          /*
           * When the editor is enabled again, the previous run
           * has ended. Draw whatever points were collected.
           */
          if (
            !this.__routeRecorderEnablePatched &&
            typeof this.enable === "function"
          ) {
            const originalEnable = this.enable;

            this.__routeRecorderEnablePatched = true;

            this.enable = function (...args) {
              globalThis.__routeRecorder.finishRecording();

              return originalEnable.apply(this, args);
            };
          }
        }
      `,
    });

  };
}

globalThis.__routeRecorder = state;

state.discoverThree = discoverThree;
state.startRecording = startRecording;
state.cancelRecording = cancelRecording;
state.finishRecording = finishRecording;
state.drawRoute = drawRoute;

export let polyMod = new RouteRecorder();
