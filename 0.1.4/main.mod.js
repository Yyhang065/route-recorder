import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,

      token: "k.appendChild(C));",

      func: `
        {
          const button = document.createElement("button");

          button.className = "button";

          const icon =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
              '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
              '<circle cx="12" cy="12" r="4" fill="currentColor"/>' +
              '</svg>'
            );

          button.innerHTML =
            '<img class="button-icon" src="' +
            icon +
            '"> ' +
            '<span>Record</span>';

          button.addEventListener("click", () => {
            const isRecording =
              button.dataset.recording === "true";

            if (isRecording) {
              button.dataset.recording = "false";

              button.innerHTML =
                '<img class="button-icon" src="' +
                icon +
                '"> ' +
                '<span>Record</span>';

              console.log("[Route Recorder] Recording disabled");
            } else {
              button.dataset.recording = "true";

              button.innerHTML =
                '<img class="button-icon" src="' +
                icon +
                '"> ' +
                '<span>Disable</span>';

              console.log("[Route Recorder] Recording enabled");
            }
          });

          k.appendChild(button);

          console.log("[Route Recorder] Button created");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
