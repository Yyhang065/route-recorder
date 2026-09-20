import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

const recorder = {
  enabled: true,
  recording: false,
  samples: [],
  lastPosition: null,
  car: null,
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

            const rr = globalThis.__routeRecorder;

            if (rr) {
              rr.enabled = enabled;
            }

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
              const p = e.position;

              if (rr.car === null) {
                rr.car = this;
              }

              if (rr.car === this) {
                const x = p.x;
                const y = p.y;
                const z = p.z;

                if (rr.lastPosition === null) {
                  rr.lastPosition = {
                    x,
                    y,
                    z,
                  };

                  rr.samples.push({
                    x,
                    y,
                    z,
                  });
                } else {
                  const dx =
                    x - rr.lastPosition.x;

                  const dy =
                    y - rr.lastPosition.y;

                  const dz =
                    z - rr.lastPosition.z;

                  const distance =
                    Math.sqrt(
                      dx * dx +
                      dy * dy +
                      dz * dz
                    );

                  const spacing = 0.5;

                  if (distance >= spacing) {
                    rr.samples.push({
                      x,
                      y,
                      z,
                    });

                    rr.lastPosition = {
                      x,
                      y,
                      z,
                    };

                    console.log(
                      "[Route Recorder] Sample:",
                      rr.samples.length,
                      x,
                      y,
                      z
                    );
                  }
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

    console.log(
      "[Route Recorder] 0.6.3 initialized"
    );
  };
}

export let polyMod = new RouteRecorder();
