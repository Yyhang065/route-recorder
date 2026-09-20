import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const recorder = {
  recording: true,
  points: [],
  carOwner: null,

  scene: null,
  button: null,
  trailGroup: null,

  Vector3: null,
  Quaternion: null,
  BufferGeometry: null,
  Float32BufferAttribute: null,
  Matrix4: null,
  Mesh: null,
  LineSegments: null,
  MeshBasicMaterial: null,
  LineBasicMaterial: null,
  DoubleSide: null,

  carVertices: null,
  massOffset: 0,

  // Similar idea to CWCTrack's CarTrailSpacing.
  // Smaller = more detailed trail.
  trailSpacing: 0.35,

  updateButton() {
    if (!this.button) return;

    const icon =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
          '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
          '<circle cx="12" cy="12" r="4" fill="white"/>' +
        "</svg>"
      );

    const text = this.recording
      ? "Recording " + this.points.length
      : "Show Route " + this.points.length;

    this.button.innerHTML =
      '<img class="button-icon" src="' +
      icon +
      '"> ' +
      text;
  },

  clearTrail() {
    if (!this.trailGroup || !this.scene) return;

    try {
      this.trailGroup.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          for (const material of materials) {
            material.dispose();
          }
        }
      });

      this.scene.remove(this.trailGroup);
    } catch (error) {
      console.warn("[Route Recorder] Failed to clear trail:", error);
    }

    this.trailGroup = null;
  },

  start() {
    this.clearTrail();

    this.points = [];
    this.carOwner = null;
    this.recording = true;

    this.updateButton();

    console.log("[Route Recorder] Recording started");
  },

  stop() {
    this.recording = false;
    this.updateButton();

    console.log(
      "[Route Recorder] Recording stopped:",
      this.points.length,
      "points"
    );
  },

  addPoint(position, quaternion) {
    if (!this.recording || !position || !quaternion) return;

    if (!this.Vector3) return;

    const point = position.clone();

    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];

      if (point.distanceTo(last.position) < this.trailSpacing) {
        return;
      }
    }

    this.points.push({
      position: point,
      quaternion: quaternion.clone(),
    });

    this.updateButton();
  },

  buildTrail() {
    if (!this.scene) {
      console.warn("[Route Recorder] Editor scene unavailable");
      return;
    }

    this.clearTrail();

    if (!this.points || this.points.length < 2) {
      console.log("[Route Recorder] Not enough points to draw route");
      return;
    }

    if (!this.carVertices || this.carVertices.length < 3) {
      console.warn(
        "[Route Recorder] Car collision vertices unavailable"
      );
      return;
    }

    const Vector3 = this.Vector3;
    const Matrix4 = this.Matrix4;

    const Mesh = this.Mesh;
    const LineSegments = this.LineSegments;

    const BufferGeometry = this.BufferGeometry;
    const Float32BufferAttribute = this.Float32BufferAttribute;

    const MeshBasicMaterial = this.MeshBasicMaterial;
    const LineBasicMaterial = this.LineBasicMaterial;

    const group = new THREE.Group();

    const rawVertices = this.carVertices;

    let flatVertices;

    try {
      flatVertices = Float32Array.from(
        rawVertices.flat
          ? rawVertices.flat()
          : rawVertices
      );
    } catch (error) {
      console.warn(
        "[Route Recorder] Could not read collision vertices:",
        error
      );
      return;
    }

    const vertexCount = flatVertices.length / 3;

    if (vertexCount < 3) {
      console.warn("[Route Recorder] Invalid collision mesh");
      return;
    }

    const round = (value) =>
      Math.round(value * 100000) / 100000;

    const vertexKey = (index) =>
      `${round(flatVertices[index * 3])},` +
      `${round(flatVertices[index * 3 + 1])},` +
      `${round(flatVertices[index * 3 + 2])}`;

    /*
     * Remove duplicate vertices.
     * This is the same basic preparation used by CWCTrack.
     */
    const indexToUnique = new Int32Array(vertexCount);
    const seenVertices = new Map();

    for (let i = 0; i < vertexCount; i++) {
      const key = vertexKey(i);

      if (!seenVertices.has(key)) {
        seenVertices.set(key, seenVertices.size);
      }

      indexToUnique[i] = seenVertices.get(key);
    }

    const readVertex = (index) =>
      new Vector3(
        flatVertices[index * 3],
        flatVertices[index * 3 + 1],
        flatVertices[index * 3 + 2]
      );

    /*
     * Calculate triangle normals.
     */
    const triangleNormals = [];

    for (let i = 0; i < vertexCount; i += 3) {
      if (i + 2 >= vertexCount) break;

      const a = readVertex(i);
      const b = readVertex(i + 1);
      const c = readVertex(i + 2);

      const ab = b.clone().sub(a);
      const ac = c.clone().sub(a);

      triangleNormals.push(
        ab.cross(ac).normalize()
      );
    }

    /*
     * Find edges of the collision mesh.
     */
    const edgeMap = new Map();

    for (let i = 0; i < vertexCount; i += 3) {
      if (i + 2 >= vertexCount) break;

      for (let edge = 0; edge < 3; edge++) {
        const a = i + edge;
        const b = i + ((edge + 1) % 3);

        const ua = indexToUnique[a];
        const ub = indexToUnique[b];

        const key =
          ua < ub
            ? `${ua}|${ub}`
            : `${ub}|${ua}`;

        let bucket = edgeMap.get(key);

        if (!bucket) {
          bucket = {
            a,
            b,
            triangles: [],
          };

          edgeMap.set(key, bucket);
        }

        bucket.triangles.push(i / 3);
      }
    }

    /*
     * Keep outside / crease edges.
     */
    const COPLANAR_EPS = 0.9995;
    const silhouetteEdges = [];

    for (const { a, b, triangles } of edgeMap.values()) {
      let isCrease = triangles.length === 1;

      for (
        let i = 0;
        i < triangles.length && !isCrease;
        i++
      ) {
        for (
          let j = i + 1;
          j < triangles.length && !isCrease;
          j++
        ) {
          const normalA =
            triangleNormals[triangles[i]];

          const normalB =
            triangleNormals[triangles[j]];

          if (
            normalA &&
            normalB &&
            Math.abs(normalA.dot(normalB)) <
              COPLANAR_EPS
          ) {
            isCrease = true;
          }
        }
      }

      if (isCrease) {
        silhouetteEdges.push([a, b]);
      }
    }

    /*
     * Transform the collision mesh at every recorded frame.
     */
    const matrix = new Matrix4();
    const scale = new Vector3(1, 1, 1);
    const temporaryVector = new Vector3();

    const frames = [];

    for (const frame of this.points) {
      if (!frame.position || !frame.quaternion) {
        continue;
      }

      matrix.compose(
        frame.position,
        frame.quaternion,
        scale
      );

      const transformed =
        new Float32Array(flatVertices.length);

      for (let i = 0; i < vertexCount; i++) {
        temporaryVector.set(
          flatVertices[i * 3],
          flatVertices[i * 3 + 1] + this.massOffset,
          flatVertices[i * 3 + 2]
        );

        temporaryVector.applyMatrix4(matrix);

        transformed[i * 3] =
          temporaryVector.x;

        transformed[i * 3 + 1] =
          temporaryVector.y;

        transformed[i * 3 + 2] =
          temporaryVector.z;
      }

      frames.push(transformed);
    }

    if (frames.length < 2) {
      console.log(
        "[Route Recorder] Not enough transformed frames"
      );
      return;
    }

    const pushVertex = (
      array,
      frame,
      index
    ) => {
      array.push(
        frame[index * 3],
        frame[index * 3 + 1],
        frame[index * 3 + 2]
      );
    };

    const tubePositions = [];
    const linePositions = [];

    /*
     * Build the continuous swept collision shape.
     */
    for (
      let frameIndex = 0;
      frameIndex < frames.length;
      frameIndex++
    ) {
      const currentFrame =
        frames[frameIndex];

      for (const [a, b] of silhouetteEdges) {
        pushVertex(
          linePositions,
          currentFrame,
          a
        );

        pushVertex(
          linePositions,
          currentFrame,
          b
        );
      }

      if (frameIndex === frames.length - 1) {
        break;
      }

      const nextFrame =
        frames[frameIndex + 1];

      for (const [a, b] of silhouetteEdges) {
        pushVertex(
          tubePositions,
          currentFrame,
          a
        );

        pushVertex(
          tubePositions,
          currentFrame,
          b
        );

        pushVertex(
          tubePositions,
          nextFrame,
          b
        );

        pushVertex(
          tubePositions,
          currentFrame,
          a
        );

        pushVertex(
          tubePositions,
          nextFrame,
          b
        );

        pushVertex(
          tubePositions,
          nextFrame,
          a
        );
      }
    }

    /*
     * Transparent filled trail.
     */
    const tubeGeometry =
      new BufferGeometry();

    tubeGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        tubePositions,
        3
      )
    );

    const tubeMaterial =
      new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

    group.add(
      new Mesh(
        tubeGeometry,
        tubeMaterial
      )
    );

    /*
     * Black outline.
     */
    const lineGeometry =
      new BufferGeometry();

    lineGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        linePositions,
        3
      )
    );

    const lineMaterial =
      new LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });

    group.add(
      new LineSegments(
        lineGeometry,
        lineMaterial
      )
    );

    this.scene.add(group);

    this.trailGroup = group;

    console.log(
      "[Route Recorder] Trail drawn:",
      frames.length,
      "frames"
    );
  },
};

globalThis.__routeRecorder = recorder;


class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * EDITOR CHUNK
     *
     * Adds the Route Recorder button beside
     * the other editor toolbar buttons.
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr = globalThis.__routeRecorder;

          console.log(
            "[Route Recorder] Editor mixin loaded"
          );

          try {
            rr.scene = n.scene;
          } catch (error) {
            console.warn(
              "[Route Recorder] Could not get editor scene",
              error
            );
          }

          /*
           * Get Three.js constructors from the editor
           * webpack chunk.
           */
          try {
            rr.Vector3 = w.Pq0;
            rr.BufferGeometry = w.LoY;
            rr.LineSegments = w.N1A;
            rr.LineBasicMaterial = w.mrM;

            /*
             * These are also available through the
             * Three.js namespace used by the editor.
             */
            rr.Matrix4 = THREE.Matrix4;
            rr.Mesh = THREE.Mesh;
            rr.MeshBasicMaterial =
              THREE.MeshBasicMaterial;

            rr.Float32BufferAttribute =
              THREE.Float32BufferAttribute;
          } catch (error) {
            console.warn(
              "[Route Recorder] Three.js setup failed",
              error
            );
          }

          /*
           * Try to get the actual PolyTrack car
           * collision mesh used by CWCTrack.
           */
          try {
            if (
              typeof VisualCar !== "undefined" &&
              VisualCar.models
            ) {
              rr.carVertices =
                VisualCar.models.collisionShapeVertices;

              rr.massOffset =
                typeof VisualCar.massOffset === "number"
                  ? VisualCar.massOffset
                  : 0;

              console.log(
                "[Route Recorder] Collision model found"
              );
            }
          } catch (error) {
            console.warn(
              "[Route Recorder] Collision model unavailable",
              error
            );
          }

          if (!rr.button) {
            const button =
              document.createElement("button");

            button.className = "button";

            rr.button = button;

            const updateButton = () => {
              rr.updateButton();
            };

            button.addEventListener(
              "click",
              () => {
                if (rr.recording) {
                  rr.stop();
                } else {
                  rr.start();
                }
              }
            );

            k.appendChild(button);

            updateButton();

            console.log(
              "[Route Recorder] BUTTON CREATED"
            );
          }

          /*
           * When PolyTrack returns from the test
           * drive to the editor, draw the recorded
           * route.
           */
          if (!this.__routeRecorderPatched) {
            this.__routeRecorderPatched = true;

            const originalEnable =
              this.enable;

            this.enable = function (...args) {
              try {
                rr.scene = n.scene;

                if (rr.recording) {
                  rr.recording = false;
                  rr.updateButton();

                  rr.buildTrail();
                }
              } catch (error) {
                console.error(
                  "[Route Recorder] Failed after test:",
                  error
                );
              }

              return originalEnable.apply(
                this,
                args
              );
            };
          }
        }
      `,
    });


    /*
     * CAR RECORDING
     *
     * PolyTrack updates the car's state through
     * this exact setter. We record the real car
     * transform after the state is applied.
     *
     * We intentionally store clones because the
     * game's Vector3 / Quaternion objects continue
     * changing every frame.
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,

      token:
        '(0, l.GG)(this, te, e, "f");',

      func: `
        {
          try {
            const rr =
              globalThis.__routeRecorder;

            if (
              rr &&
              rr.recording &&
              this &&
              typeof this.getPosition === "function" &&
              typeof this.getQuaternion === "function"
            ) {
              const position =
                this.getPosition();

              const quaternion =
                this.getQuaternion();

              if (
                position &&
                quaternion
              ) {
                if (rr.carOwner === null) {
                  rr.carOwner = this;

                  console.log(
                    "[Route Recorder] Car locked"
                  );
                }

                if (
                  rr.carOwner === this
                ) {
                  rr.addPoint(
                    position,
                    quaternion
                  );
                }
              }
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
  };
}

export let polyMod =
  new RouteRecorder();
