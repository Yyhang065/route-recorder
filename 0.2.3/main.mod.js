import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

const recorder = {
  // Recording is ALWAYS enabled.
  recording: true,

  // Trail visibility is controlled by the button.
  visible: true,

  samples: [],
  carOwner: null,
  lastPosition: null,

  trail: null,
  scene: null,
  THREE: null,

  spacing: 0.75,
  button: null,
};

globalThis.__routeRecorder = recorder;

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(
    dx * dx +
    dy * dy +
    dz * dz
  );
}

function hideTrail() {
  const rr = globalThis.__routeRecorder;

  if (rr.trail && rr.scene) {
    rr.scene.remove(rr.trail);
  }
}

function showTrail() {
  const rr = globalThis.__routeRecorder;

  if (!rr.trail || !rr.scene) {
    return;
  }

  rr.scene.add(rr.trail);
}

function updateButton() {
  const rr = globalThis.__routeRecorder;

  if (!rr.button) {
    return;
  }

  const icon =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
        '<circle cx="12" cy="12" r="4" fill="white"/>' +
      "</svg>"
    );

  rr.button.innerHTML =
    '<img class="button-icon" src="' +
    icon +
    '"> ' +
    (rr.visible
      ? "Disable trail"
      : "Enable trail");
}

function drawTrail() {
  const rr = globalThis.__routeRecorder;

  if (!rr.THREE || !rr.scene) {
    console.log(
      "[Route Recorder] Scene/THREE not ready."
    );
    return;
  }

  if (rr.samples.length < 2) {
    console.log(
      "[Route Recorder] Not enough samples:",
      rr.samples.length
    );
    return;
  }

  const THREE = rr.THREE;

  if (rr.trail) {
    hideTrail();

    rr.trail.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        object.material.dispose();
      }
    });

    rr.trail = null;
  }

  /*
   * Approximate car hitbox.
   * The important part is that every recorded
   * position gets a rotated 3D box.
   */
  const box = [
    new THREE.Vector3(-0.75, -0.35, -1.35),
    new THREE.Vector3(0.75, -0.35, -1.35),
    new THREE.Vector3(0.75, 0.35, -1.35),
    new THREE.Vector3(-0.75, 0.35, -1.35),

    new THREE.Vector3(-0.75, -0.35, 1.35),
    new THREE.Vector3(0.75, -0.35, 1.35),
    new THREE.Vector3(0.75, 0.35, 1.35),
    new THREE.Vector3(-0.75, 0.35, 1.35),
  ];

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],

    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],

    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  const positions = [];

  for (let i = 0; i < rr.samples.length; i++) {
    const sample = rr.samples[i];

    const center =
      new THREE.Vector3(
        sample.x,
        sample.y,
        sample.z
      );

    const quaternion =
      new THREE.Quaternion(
        sample.quaternion?.x ?? 0,
        sample.quaternion?.y ?? 0,
        sample.quaternion?.z ?? 0,
        sample.quaternion?.w ?? 1
      );

    const current = box.map((vertex) => {
      const point = vertex.clone();

      point.applyQuaternion(quaternion);
      point.add(center);

      return point;
    });

    for (const [a, b] of edges) {
      positions.push(
        current[a].x,
        current[a].y,
        current[a].z,

        current[b].x,
        current[b].y,
        current[b].z
      );
    }

    if (i + 1 >= rr.samples.length) {
      continue;
    }

    const nextSample =
      rr.samples[i + 1];

    const nextCenter =
      new THREE.Vector3(
        nextSample.x,
        nextSample.y,
        nextSample.z
      );

    const nextQuaternion =
      new THREE.Quaternion(
        nextSample.quaternion?.x ?? 0,
        nextSample.quaternion?.y ?? 0,
        nextSample.quaternion?.z ?? 0,
        nextSample.quaternion?.w ?? 1
      );

    const next = box.map((vertex) => {
      const point = vertex.clone();

      point.applyQuaternion(nextQuaternion);
      point.add(nextCenter);

      return point;
    });

    /*
     * Sweep the hitbox between this frame
     * and the next frame.
     */
    for (let j = 0; j < box.length; j++) {
      positions.push(
        current[j].x,
        current[j].y,
        current[j].z,

        next[j].x,
        next[j].y,
        next[j].z
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  const material =
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

  rr.trail =
    new THREE.LineSegments(
      geometry,
      material
    );

  rr.trail.renderOrder = 999;

  if (rr.visible) {
    rr.scene.add(rr.trail);
  }

  console.log(
    "[Route Recorder] Trail created from",
    rr.samples.length,
    "samples."
  );
}

class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * EDITOR BUTTON
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "G.appendChild(C));",

      func: `
        {
          const rr =
            globalThis.__routeRecorder;

          console.log(
            "[Route Recorder] EDITOR MIXIN HIT"
          );

          rr.scene =
            this.scene ||
            this._scene ||
            this.editorScene ||
            null;

          /*
           * The editor chunk imports Three.js as "w".
           */
          if (typeof w !== "undefined") {
            rr.THREE = w;
          }

          const button =
            document.createElement("button");

          button.className = "button";

          rr.button = button;

          button.addEventListener(
            "click",
            () => {
              rr.visible = !rr.visible;

              if (rr.visible) {
                showTrail();
              } else {
                hideTrail();
              }

              updateButton();

              console.log(
                "[Route Recorder] Trail:",
                rr.visible
                  ? "Visible"
                  : "Hidden"
              );
            }
          );

          G.appendChild(button);

          updateButton();

          setTimeout(() => {
            const r =
              globalThis.__routeRecorder;

            r.scene =
              this.scene ||
              this._scene ||
              this.editorScene ||
              r.scene;

            if (typeof w !== "undefined") {
              r.THREE = w;
            }

            if (r.samples.length >= 2) {
              drawTrail();
            }

            console.log(
              "[Route Recorder] Editor ready"
            );
          }, 100);

          console.log(
            "[Route Recorder] BUTTON CREATED"
          );
        }
      `,
    });

    /*
     * Recording hook.
     *
     * Recording is intentionally independent
     * from the button's visibility state.
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
              !rr ||
              !rr.recording ||
              !e ||
              !e.position
            ) {
              return;
            }

            if (rr.carOwner === null) {
              rr.carOwner = this;

              console.log(
                "[Route Recorder] Player car detected"
              );
            }

            if (rr.carOwner !== this) {
              return;
            }

            const position = e.position;

            const current = {
              x: position.x,
              y: position.y,
              z: position.z,
            };

            if (
              rr.lastPosition &&
              distance(
                current,
                rr.lastPosition
              ) < rr.spacing
            ) {
              return;
            }

            rr.samples.push({
              x: current.x,
              y: current.y,
              z: current.z,

              quaternion:
                e.quaternion
                  ? {
                      x: e.quaternion.x,
                      y: e.quaternion.y,
                      z: e.quaternion.z,
                      w: e.quaternion.w,
                    }
                  : {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
            });

            rr.lastPosition = current;

            if (
              rr.samples.length === 1 ||
              rr.samples.length % 25 === 0
            ) {
              console.log(
                "[Route Recorder] Samples:",
                rr.samples.length
              );
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

    globalThis.__routeRecorder.drawTrail =
      drawTrail;

    console.log(
      "[Route Recorder] 0.6.3 initialized"
    );
  };
}

export let polyMod =
  new RouteRecorder();
