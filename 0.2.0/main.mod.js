import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const state = {
  recording: false,
  points: [],
  carOwner: null,

  scene: null,
  Vector3: null,
  BufferGeometry: null,
  LineBasicMaterial: null,
  Line: null,

  button: null,
  editor: null,
};

function clearRoute() {
  state.points.length = 0;

  if (state.line && state.scene) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
  }

  state.line = null;
}

function addPoint(position) {
  if (!position) return;

  const last = state.points[state.points.length - 1];

  // Don't add hundreds of practically identical points.
  if (
    last &&
    (position.x - last.x) ** 2 +
      (position.y - last.y) ** 2 +
      (position.z - last.z) ** 2 <
      0.0025
  ) {
    return;
  }

  state.points.push({
    x: position.x,
    y: position.y,
    z: position.z,
  });

  if (state.button) {
    state.button.textContent = `Recording ${state.points.length}`;
  }
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

  if (state.line) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
    state.line = null;
  }

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

function startRecording() {
  clearRoute();

  state.recording = true;
  state.carOwner = null;

  if (state.button) {
    state.button.textContent = "Recording 0";
  }

  console.log("[Route Recorder] Recording started");
}

function finishRecording() {
  if (!state.recording) return;

  state.recording = false;
  state.carOwner = null;

  if (state.button) {
    state.button.textContent =
      state.points.length > 0
        ? `Show Route ${state.points.length}`
        : "Record Next Run";
  }

  drawRoute();

  console.log(
    `[Route Recorder] Recording finished: ${state.points.length} points`
  );
}

function toggleRecording() {
  if (state.recording) {
    finishRecording();
  } else {
    startRecording();
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

class RouteRecorder extends PolyMod {
  init = (pml) => {
    /*
     * Editor setup
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "k.appendChild(C));",
      func: `
        {
          const rr = globalThis.__routeRecorder;

          rr.scene = n.scene;

          try {
            if (typeof w !== "undefined") {
              rr.discoverThree(Object.values(w));
            }
          } catch (_) {}

          if (!rr.button && typeof k?.appendChild === "function") {
            const button = document.createElement("button");

            button.className = "button";
            button.textContent = "Record Next Run";
            button.title =
              "Record the car path during the next test run";

            button.addEventListener("click", () => {
              rr.toggleRecording();
            });

            rr.button = button;
            rr.editor = this;

            k.appendChild(button);
          }

          console.log("[Route Recorder] Editor initialized");
        }
      `,
    });

    /*
     * When the editor is enabled again, finish the recording.
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "enable() {",
      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (rr.recording) {
            rr.finishRecording();
          }
        }
      `,
    });
  };
}

/*
 * Make the mod accessible from the game bundle.
 */
globalThis.__routeRecorder = state;

state.addPoint = addPoint;
state.clearRoute = clearRoute;
state.drawRoute = drawRoute;
state.startRecording = startRecording;
state.finishRecording = finishRecording;
state.toggleRecording = toggleRecording;
state.discoverThree = discoverThree;

export let polyMod = new RouteRecorder();
