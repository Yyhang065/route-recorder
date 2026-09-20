import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

const recorder = {
  enabled: true,
  samples: [],
  carOwner: null,
};

globalThis.__routeRecorder = recorder;

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
          console.log("[Route Recorder] EDITOR MIXIN HIT");

          const rr = globalThis.__routeRecorder;

          const button = document.createElement("button");

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
              (rr.enabled ? "Enabled" : "Disabled");
          };

          button.addEventListener("click", () => {
            rr.enabled = !rr.enabled;

            updateButton();

            console.log(
              "[Route Recorder] Recording:",
              rr.enabled ? "Enabled" : "Disabled"
            );
          });

          G.appendChild(button);

          updateButton();

          console.log("[Route Recorder] BUTTON CREATED");
        }
      `,
    });

    /*
     * CAR STATE RECORDING
     *
     * This is the same car-state setter pattern
     * we previously verified in PolyTrack 0.6.2.
     */
    pml.registerGlobalMixin({
      type: MixinType.INSERT,

      token: '(0, l.GG)(this, te, e, "f");',

      func: `
        {
          try {
            const rr = globalThis.__routeRecorder;

            if (
              rr &&
              rr.enabled &&
              e &&
              e.position
            ) {
              if (rr.carOwner === null) {
                rr.carOwner = this;

                console.log(
                  "[Route Recorder] Car found"
                );
              }

              if (rr.carOwner === this) {
                const position = e.position;

                rr.samples.push({
                  x: position.x,
                  y: position.y,
                  z: position.z,
                });

                if (
                  rr.samples.length === 1 ||
                  rr.samples.length % 25 === 0
                ) {
                  console.log(
                    "[Route Recorder] Points:",
                    rr.samples.length,
                    "Position:",
                    position.x,
                    position.y,
                    position.z
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

    /*
     * Debug helpers
     */
    globalThis.__routeRecorder.getPoints = () => {
      console.log(
        "[Route Recorder] Recorded points:",
        globalThis.__routeRecorder.samples.length
      );

      return globalThis.__routeRecorder.samples;
    };

    globalThis.__routeRecorder.clear = () => {
      globalThis.__routeRecorder.samples = [];
      globalThis.__routeRecorder.carOwner = null;

      console.log(
        "[Route Recorder] Recording cleared"
      );
    };

    console.log(
      "[Route Recorder] 0.6.3 initialized"
    );
  };
}

export let polyMod = new RouteRecorder();
