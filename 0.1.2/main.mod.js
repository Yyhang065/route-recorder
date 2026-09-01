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

function clearLine() {
  if (state.line && state.scene) {
    state.scene.remove(state.line);

    if (state.line.geometry) {
      state.line.geometry.dispose();
    }

    if (state.line.material) {
      state.line.material.dispose();
    }
  }

  state.line = null;
}

function startRecording() {
  state.recording = true;
  state.carOwner = null;
  state.points = [];

  clearLine();

  if (state.button) {
    state.button.textContent = "Don't Record Next Run";
  }
}

function cancelRecording() {
  state.recording = false;
  state.carOwner = null;
  state.points = [];

  if (state.button) {
    state.button.textContent = "Record Next Run";
  }
}

function finishRecording() {
  if (!state.recording) {
    return;
  }

  state.recording = false;
  state.carOwner = null;

  if (state.button) {
    state.button.textContent = "Record Next Run";
  }

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

  const geometry = new state.BufferGeometry();

  const vertices = [];

  for (const point of state.points) {
    vertices.push(point.x);
    vertices.push(point.y);
    vertices.push(point.z);
  }

  geometry.setAttribute(
    "position",
    new state.Vector3()
  );

  try {
    geometry.setFromPoints(
      state.points.map(
        (point) =>
          new state.Vector3(
            point.x,
            point.y,
            point.z
          )
      )
    );
  } catch (_) {
    return;
  }

  const material = new state.LineBasicMaterial({
    color: 0x00bfff,
    depthTest: false,
    depthWrite: false,
  });

  const line = new state.Line(
    geometry,
    material
  );

  line.renderOrder = 9999;

  state.line = line;

  state.scene.add(line);
}

function discoverThree(values) {
  if (!values) {
    return;
  }

  for (const value of values) {
    if (!value || !value.prototype) {
      continue;
    }

    if (
      !state.Vector3 &&
      value.prototype.isVector3
    ) {
      state.Vector3 = value;
    }

    if (
      !state.BufferGeometry &&
      value.prototype.isBufferGeometry
    ) {
      state.BufferGeometry = value;
    }

    if (
      !state.LineBasicMaterial &&
      value.prototype.isLineBasicMaterial
    ) {
      state.LineBasicMaterial = value;
    }

    if (
      !state.Line &&
      value.prototype.isLine
    ) {
      state.Line = value;
    }
  }
}

class RouteRecorder extends PolyMod {
  init = (pml) => {
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr = globalThis.__routeRecorder;

          try {
            if (typeof w !== "undefined") {
              rr.discoverThree(Object.values(w));
            }
          } catch (_) {}

          if (!rr.button) {
            const button = document.createElement("button");

            button.className = "button";

            button.innerHTML = "Record Next Run";

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
        }
      `,
    });

    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "(Hn = function () {",

      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (rr.recording) {
            rr.points = [];
            rr.carOwner = null;
          }
        }
      `,
    });

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
            if (rr.carOwner === null) {
              rr.carOwner = this;
            }

            if (rr.carOwner === this) {
              const position = e.position;

              const last =
                rr.points[rr.points.length - 1];

              if (
                !last ||
                Math.pow(
                  position.x - last.x,
                  2
                ) +
                  Math.pow(
                    position.y - last.y,
                    2
                  ) +
                  Math.pow(
                    position.z - last.z,
                    2
                  ) >
                  0.0025
              ) {
                rr.points.push({
                  x: position.x,
                  y: position.y,
                  z: position.z,
                });
              }
            }
          }
        }
      `,
    });

    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "enable() {",

      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (rr && rr.recording) {
            rr.finishRecording();
          }
        }
      `,
    });
  };
}

globalThis.__routeRecorder = state;

state.startRecording = startRecording;
state.cancelRecording = cancelRecording;
state.finishRecording = finishRecording;
state.discoverThree = discoverThree;

export let polyMod = new RouteRecorder();
