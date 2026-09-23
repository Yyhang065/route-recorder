import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

const recorder = {
  enabled: true,
  recording: false,
  samples: [],
  carOwner: null,

  trail: null,
  scene: null,
  THREE: null,

  spacing: 0.75,
  lastPosition: null,
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

function clearTrail() {
  const rr = globalThis.__routeRecorder;

  if (!rr.trail || !rr.scene) {
    return;
  }

  rr.scene.remove(rr.trail);

  if (rr.trail.traverse) {
    rr.trail.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            material.dispose();
          }
        } else {
          object.material.dispose();
        }
      }
    });
  }

  rr.trail = null;
}

function drawTrail() {
  const rr = globalThis.__routeRecorder;

  if (!rr.scene || !rr.THREE) {
    console.log(
      "[Route Recorder] Cannot draw trail: scene or THREE missing."
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

  clearTrail();

  const THREE = rr.THREE;

  /*
   * Approximate PolyTrack car collision box.
   *
   * CWCTrack's trail is based on the car hitbox rather
   * than simply drawing a centerline. We do the same idea
   * here with a swept box.
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

    const quaternion =
      sample.quaternion
        ? new THREE.Quaternion(
            sample.quaternion.x,
            sample.quaternion.y,
            sample.quaternion.z,
            sample.quaternion.w
          )
        : new THREE.Quaternion();

    const center =
      new THREE.Vector3(
        sample.x,
        sample.y,
        sample.z
      );

    const transformed = [];

    for (const vertex of box) {
      const point = vertex.clone();

      point.applyQuaternion(quaternion);
      point.add(center);

      transformed.push(point);
    }

    /*
     * Draw the hitbox at this sample.
     */
    for (const [a, b] of edges) {
      positions.push(
        transformed[a].x,
        transformed[a].y,
        transformed[a].z,

        transformed[b].x,
        transformed[b].y,
        transformed[b].z
      );
    }

    /*
     * Connect this hitbox to the next one.
     * This produces the swept 3D trail instead of
     * disconnected boxes.
     */
    if (i < rr.samples.length - 1) {
      const next = rr.samples[i + 1];

      const nextQuaternion =
        next.quaternion
          ? new THREE.Quaternion(
              next.quaternion.x,
              next.quaternion.y,
              next.quaternion.z,
              next.quaternion.w
            )
          : new THREE.Quaternion();

      const nextCenter =
        new THREE.Vector3(
          next.x,
          next.y,
          next.z
        );

      const nextTransformed = [];

      for (const vertex of box) {
        const point = vertex.clone();

        point.applyQuaternion(nextQuaternion);
        point.add(nextCenter);

        nextTransformed.push(point);
      }

      for (const [a, b] of edges) {
        positions.push(
          transformed[a].x,
          transformed[a].y,
          transformed[a].z,

          nextTransformed[a].x,
          nextTransformed[a].y,
          nextTransformed[a].z
        );
      }
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
      opacity: 0.8,
      depthWrite: false,
    });

  const line =
    new THREE.LineSegments(
      geometry,
      material
    );

  line.renderOrder = 999;

  rr.scene.add(line);

  rr.trail = line;

  console.log(
    "[Route Recorder] 3D trail drawn:",
    rr.samples.length,
    "samples"
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
          const rr = globalThis.__routeRecorder;

          console.log(
            "[Route Recorder] EDITOR MIXIN HIT"
          );

          rr.scene =
            this.scene ||
            this._scene ||
            this.editorScene ||
            null;

          /*
           * PolyTrack's editor chunk already imports
           * Three.js as module "w".
           */
          if (typeof w !== "undefined") {
            rr.THREE = w;
          }

          const button =
            document.createElement("button");

          button.className = "button";

          const updateButton = () => {
            const icon =
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
                  '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
                  '<circle cx="12" cy="12" r="4" fill="white"/>' +
                "</svg>"
              );

            button.innerHTML =
              '<img class="button-icon" src="' +
              icon +
              '"> ' +
              (rr.enabled
                ? "Enabled"
                : "Disabled");
          };

          button.addEventListener(
            "click",
            () => {
              rr.enabled = !rr.enabled;

              updateButton();

              console.log(
                "[Route Recorder] Recording:",
                rr.enabled
                  ? "Enabled"
                  : "Disabled"
              );
            }
          );

          G.appendChild(button);

          updateButton();

          /*
           * Give the editor a chance to finish
           * constructing its scene.
           */
          setTimeout(() => {
            const r =
              globalThis.__routeRecorder;

            r.scene =
              this.scene ||
              this._scene ||
              this.editorScene ||
              r.scene;

            if (
              typeof w !== "undefined"
            ) {
              r.THREE = w;
            }

            if (
              r.samples.length >= 2
            ) {
              r.drawTrail();
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
     * Expose trail drawing to the injected code.
     */
    globalThis.__routeRecorder.drawTrail =
      drawTrail;

    /*
     * CAR STATE HOOK
     *
     * This is the car-state setter pattern
     * verified in the earlier PolyTrack bundle.
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
              !rr.enabled ||
              !e ||
              !e.position
            ) {
              return;
            }

            /*
             * The first object receiving car states
             * becomes the player's car.
             */
            if (
              rr.carOwner === null
            ) {
              rr.carOwner = this;

              console.log(
                "[Route Recorder] Player car detected"
              );
            }

            if (
              rr.carOwner !== this
            ) {
              return;
            }

            const position = e.position;

            const current = {
              x: position.x,
              y: position.y,
              z: position.z,
            };

            /*
             * Only save a sample after the car has
             * moved enough. This is the same basic
             * spacing concept used by CWCTrack.
             */
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

    /*
     * Debug / control functions.
     */
    globalThis.__routeRecorder.clear =
      () => {
        const rr =
          globalThis.__routeRecorder;

        rr.samples = [];
        rr.carOwner = null;
        rr.lastPosition = null;

        console.log(
          "[Route Recorder] Samples cleared"
        );
      };

    globalThis.__routeRecorder.getSamples =
      () => {
        return globalThis
          .__routeRecorder
          .samples;
      };

    console.log(
      "[Route Recorder] 0.6.3 initialized"
    );
  };
}

export let polyMod =
  new RouteRecorder();
