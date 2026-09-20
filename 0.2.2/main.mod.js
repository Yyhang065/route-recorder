import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {

    /*
     * PolyTrack 0.6.2
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
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
            updateButton();

            console.log(
              "[Route Recorder] 0.6.2 Button:",
              enabled ? "Enabled" : "Disabled"
            );
          });

          k.appendChild(button);

          updateButton();

          console.log(
            "[Route Recorder] 0.6.2 BUTTON CREATED"
          );
        }
      `,
    });


    /*
     * PolyTrack 0.6.3
     */
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "G.appendChild(C));",

      func: `
        {
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
            updateButton();

            console.log(
              "[Route Recorder] 0.6.3 Button:",
              enabled ? "Enabled" : "Disabled"
            );
          });

          G.appendChild(button);

          updateButton();

          console.log(
            "[Route Recorder] 0.6.3 BUTTON CREATED"
          );
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
