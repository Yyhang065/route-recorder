import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

const recorder = {
  enabled: true,
  samples: [],
  editor: null,
  trailGroup: null,
};

globalThis.__routeRecorder = recorder;

class RouteRecorder extends PolyMod {
  init = (pml) => {
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "G.appendChild(C));",

      func: `
        {
          console.log("[Route Recorder] EDITOR MIXIN HIT");

          globalThis.__routeRecorder.editor = this;

          const button = document.createElement("button");

          button.className = "button";

          let enabled = true;

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
              (enabled ? "Enabled" : "Disabled");
          };

          button.addEventListener("click", () => {
            enabled = !enabled;

            globalThis.__routeRecorder.enabled = enabled;

            updateButton();

            console.log(
              "[Route Recorder] Button:",
              enabled ? "Enabled" : "Disabled"
            );
          });

          G.appendChild(button);

          updateButton();

          console.log("[Route Recorder] BUTTON CREATED");
        }
      `,
    });

    globalThis.__routeRecorder.renderTrail = () => {
      const rr = globalThis.__routeRecorder;

      if (!rr.editor) {
        console.log("[Route Recorder] No editor instance.");
        return;
      }

      if (!Array.isArray(rr.samples)) {
        return;
      }

      if (rr.samples.length < 2) {
        console.log(
          "[Route Recorder] Not enough samples:",
          rr.samples.length
        );
        return;
      }

      const THREE = globalThis.THREE;

      if (!THREE) {
        console.log(
          "[Route Recorder] THREE is not globally available."
        );
        return;
      }

      if (rr.trailGroup) {
        rr.trailGroup.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                material.dispose();
              });
            } else {
              object.material.dispose();
            }
          }
        });

        rr.editor.scene?.remove(rr.trailGroup);
        rr.trailGroup = null;
      }

      const vertices = [
        [-0.75, -0.35, -1.35],
        [0.75, -0.35, -1.35],
        [0.75, 0.35, -1.35],
        [-0.75, 0.35, -1.35],
        [-0.75, -0.35, 1.35],
        [0.75, -0.35, 1.35],
        [0.75, 0.35, 1.35],
        [-0.75, 0.35, 1.35],
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

      const linePositions = [];
      const tubePositions = [];

      const transformVertex = (vertex, sample) => {
        const vector = new THREE.Vector3(
          vertex[0],
          vertex[1],
          vertex[2]
        );

        if (sample.quaternion) {
          vector.applyQuaternion(sample.quaternion);
        }

        vector.add(
          new THREE.Vector3(
            sample.x,
            sample.y,
            sample.z
          )
        );

        return vector;
      };

      const frames = [];

      for (const sample of rr.samples) {
        if (
          typeof sample.x !== "number" ||
          typeof sample.y !== "number" ||
          typeof sample.z !== "number"
        ) {
          continue;
        }

        const frame = [];

        for (const vertex of vertices) {
          frame.push(
            transformVertex(vertex, sample)
          );
        }

        frames.push(frame);
      }

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];

        for (const [a, b] of edges) {
          linePositions.push(
            frame[a].x,
            frame[a].y,
            frame[a].z,
            frame[b].x,
            frame[b].y,
            frame[b].z
          );
        }

        if (i >= frames.length - 1) {
          continue;
        }

        const next = frames[i + 1];

        for (const [a, b] of edges) {
          tubePositions.push(
            frame[a].x,
            frame[a].y,
            frame[a].z,

            frame[b].x,
            frame[b].y,
            frame[b].z,

            next[b].x,
            next[b].y,
            next[b].z,

            frame[a].x,
            frame[a].y,
            frame[a].z,

            next[b].x,
            next[b].y,
            next[b].z,

            next[a].x,
            next[a].y,
            next[a].z
          );
        }
      }

      const group = new THREE.Group();

      const tubeGeometry =
        new THREE.BufferGeometry();

      tubeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          tubePositions,
          3
        )
      );

      const tubeMaterial =
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

      group.add(
        new THREE.Mesh(
          tubeGeometry,
          tubeMaterial
        )
      );

      const lineGeometry =
        new THREE.BufferGeometry();

      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          linePositions,
          3
        )
      );

      const lineMaterial =
        new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });

      group.add(
        new THREE.LineSegments(
          lineGeometry,
          lineMaterial
        )
      );

      if (rr.editor.scene) {
        rr.editor.scene.add(group);
        rr.trailGroup = group;
      }

      console.log(
        "[Route Recorder] Trail rendered:",
        frames.length,
        "frames"
      );
    };

    globalThis.__routeRecorder.testTrail = () => {
      const rr = globalThis.__routeRecorder;

      rr.samples = [];

      for (let i = 0; i < 40; i++) {
        rr.samples.push({
          x: i * 0.8,
          y: 0,
          z: Math.sin(i * 0.35) * 5,
          quaternion: {
            x: 0,
            y: 0,
            z: 0,
            w: 1,
          },
        });
      }

      rr.renderTrail();
    };

    console.log(
      "[Route Recorder] 0.6.3 initialized"
    );
  };
}

export let polyMod = new RouteRecorder();
