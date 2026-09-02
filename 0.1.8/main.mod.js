import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const state = {
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
};

function addPoint(position) {
  if (!position || !state.recording) return;

  const last = state.points[state.points.length - 1];

  if (
    !last ||
    (position.x - last.x) ** 2 +
      (position.y - last.y) ** 2 +
      (position.z - last.z) ** 2 >
      0.0025
  ) {
    state.points.push({
      x: position.x,
      y: position.y,
      z: position.z,
    });

    if (state.button) {
      state.button.textContent =
        "Recording " + state.points.length;
    }
  }
}

function clearRoute() {
  if (state.line && state.scene) {
    state.scene.remove(state.line);
    state.line.geometry?.dispose();
    state.line.material?.dispose();
  }

  state.line = null;
}

function drawRoute() {
  if (
    !state.scene ||
    !state.Vector3 ||
    !state.BufferGeometry ||
    !state.Line ||
    !state.LineBasicMaterial ||
    state.points.length < 2
  ) {
    return;
  }

  clearRoute();

  const geometry =
    new state.BufferGeometry().setFromPoints(
      state.points.map(
        (p) =>
          new state.Vector3(
            p.x,
            p.y,
            p.z
          )
      )
    );

  const material =
    new state.LineBasicMaterial({
      color: 0x00bfff,
      depthTest: false,
      depthWrite: false,
    });

  state.line =
    new state.Line(
      geometry,
      material
    );

  state.line.renderOrder = 9999;

  state.scene.add(state.line);
}

function startRecording() {
  state.recording = true;
  state.points.length = 0;
  state.carOwner = null;

  clearRoute();

  if (state.button) {
    state.button.textContent =
      "Recording 0";
  }
}

function finishRecording() {
  state.recording = false;
  state.carOwner = null;

  if (state.button) {
    state.button.textContent =
      "Show Route " + state.points.length;
  }

  drawRoute();
}

class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * EDITOR
     *
     * Everything for chunk 112 is kept
     * inside ONE chunk mixin.
     */
    pml.registerChunkMixin("112.bundle.js", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr =
            globalThis.__routeRecorder;

          if (!rr.button) {
            const button =
              document.createElement("button");

            button.className = "button";

            button.textContent =
              "Recording " +
              rr.points.length;

            button.title =
              "Record the next test run";

            button.addEventListener(
              "click",
              () => {
                if (rr.recording) {
                  rr.finishRecording();
                } else {
                  rr.startRecording();
                }
              }
            );

            rr.button = button;

            k.appendChild(button);
          }

          try {
            rr.scene = n.scene;

            if (
              typeof w !== "undefined"
            ) {
              const values =
                Object.values(w);

              rr.Vector3 =
                values.find(
                  v =>
                    v?.prototype?.isVector3
                ) ||
                rr.Vector3;

              rr.BufferGeometry =
                values.find(
                  v =>
                    v?.prototype
                      ?.isBufferGeometry
                ) ||
                rr.BufferGeometry;

              rr.Line =
                values.find(
                  v =>
                    v?.prototype?.isLine
                ) ||
                rr.Line;

              rr.LineBasicMaterial =
                values.find(
                  v =>
                    v?.prototype
                      ?.isLineBasicMaterial
                ) ||
                rr.LineBasicMaterial;
            }
          } catch (_) {}

          if (
            rr.points.length >= 2 &&
            !rr.recording
          ) {
            rr.drawRoute();
          }
        }
      `,
    });

    /*
     * CAR STATE
     *
     * This is the important fix from 0.1.7.
     */
    pml.registerClassMixin(
      "A.prototype",
      "setCarState",
      {
        type: MixinType.INSERT,

        token:
          '(0, l.GG)(this, te, e, "f");',

        func: `
          {
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
          }
        `,
      }
    );
  };
}

globalThis.__routeRecorder = state;

state.addPoint = addPoint;
state.clearRoute = clearRoute;
state.drawRoute = drawRoute;
state.startRecording = startRecording;
state.finishRecording = finishRecording;

export let polyMod =
  new RouteRecorder();
