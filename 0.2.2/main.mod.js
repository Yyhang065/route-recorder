import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";


const recorder = {
  recording: true,
  points: [],

  scene: null,
  button: null,

  Vector3: null,
  BufferGeometry: null,
  Line: null,
  LineBasicMaterial: null,


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

    this.button.innerHTML =
      '<img class="button-icon" src="' +
      icon +
      '"> ' +
      (this.recording
        ? "Recording " + this.points.length
        : "Show Route " + this.points.length);
  },


  start() {
    this.points = [];
    this.recording = true;
    this.updateButton();

    console.log(
      "[Route Recorder] Recording started"
    );
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


  addPoint(position) {
    if (!this.recording || !position) {
      return;
    }

    if (!this.Vector3) {
      return;
    }

    const point = new this.Vector3(
      position.x,
      position.y,
      position.z
    );

    /*
     * CWCTrack uses distance-based spacing.
     *
     * We start with a simple spacing value here
     * before adding the collision-shape trail.
     */
    if (this.points.length > 0) {
      const last =
        this.points[this.points.length - 1];

      if (
        point.distanceTo(last) < 0.35
      ) {
        return;
      }
    }

    this.points.push(point);

    this.updateButton();
  },


  drawRoute() {
    if (!this.scene) {
      console.warn(
        "[Route Recorder] Scene unavailable"
      );
      return;
    }

    if (
      !this.Vector3 ||
      !this.BufferGeometry ||
      !this.Line ||
      !this.LineBasicMaterial
    ) {
      console.warn(
        "[Route Recorder] Three.js constructors unavailable"
      );
      return;
    }

    if (this.points.length < 2) {
      console.log(
        "[Route Recorder] Not enough points:",
        this.points.length
      );
      return;
    }

    /*
     * Remove the previous route if one exists.
     */
    if (this.routeLine) {
      try {
        this.scene.remove(this.routeLine);

        if (this.routeLine.geometry) {
          this.routeLine.geometry.dispose();
        }

        if (this.routeLine.material) {
          this.routeLine.material.dispose();
        }
      } catch (error) {
        console.warn(
          "[Route Recorder] Failed to remove old route",
          error
        );
      }

      this.routeLine = null;
    }


    const geometry =
      new this.BufferGeometry();

    /*
     * BufferGeometry.fromPoints is used instead
     * of constructing any THREE classes directly.
     */
    geometry.setFromPoints(this.points);


    const material =
      new this.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });


    const line =
      new this.Line(
        geometry,
        material
      );


    this.scene.add(line);

    this.routeLine = line;

    console.log(
      "[Route Recorder] Route drawn:",
      this.points.length,
      "points"
    );
  },
};


globalThis.__routeRecorder = recorder;


class RouteRecorder extends PolyMod {

  init = (pml) => {

    /*
     * EDITOR
     *
     * This is the exact editor injection that
     * was already proven to work in 0.2.1.
     */
    pml.registerChunkMixin("112", {

      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const rr =
            globalThis.__routeRecorder;

          console.log(
            "[Route Recorder] EDITOR MIXIN HIT"
          );


          /*
           * Get the editor scene.
           *
           * This variable is known to exist at
           * this exact injection point.
           */
          try {
            rr.scene = n.scene;
          } catch (error) {
            console.warn(
              "[Route Recorder] Scene unavailable",
              error
            );
          }


          /*
           * Get the Three.js constructors from
           * the editor chunk.
           *
           * These were verified from chunk 112.
           */
          try {
            rr.Vector3 = w.Pq0;
            rr.BufferGeometry = w.LoY;
            rr.Line = w.N1A;
            rr.LineBasicMaterial = w.mrM;
          } catch (error) {
            console.warn(
              "[Route Recorder] Three.js setup failed",
              error
            );
          }


          /*
           * Create the button.
           */
          if (!rr.button) {

            const button =
              document.createElement("button");

            button.className = "button";

            rr.button = button;


            button.addEventListener(
              "click",
              () => {

                if (rr.recording) {
                  rr.stop();

                  /*
                   * Show the route when recording
                   * is stopped manually.
                   */
                  rr.drawRoute();

                } else {
                  rr.start();
                }

              }
            );


            k.appendChild(button);

            rr.updateButton();


            console.log(
              "[Route Recorder] BUTTON CREATED"
            );
          }


          /*
           * When the editor becomes active again
           * after a test, show the recorded route.
           */
          if (!this.__routeRecorderPatched) {

            this.__routeRecorderPatched = true;

            const originalEnable =
              this.enable;


            this.enable = function (...args) {

              try {

                rr.scene = n.scene;

                if (
                  !rr.recording &&
                  rr.points.length > 1
                ) {
                  rr.drawRoute();
                }

              } catch (error) {

                console.error(
                  "[Route Recorder] Draw error:",
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
     * CAR STATE RECORDING
     *
     * This is deliberately kept extremely small
     * for this stability test.
     *
     * We use the exact state object we already
     * verified in PolyTrack 0.6.2.
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
              e &&
              e.position
            ) {

              rr.addPoint(
                e.position
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
  };
}


export let polyMod =
  new RouteRecorder();
