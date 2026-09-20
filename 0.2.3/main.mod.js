import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {
    pml.registerChunkMixin("112", {
      type: MixinType.INSERT,
      token: "G.appendChild(C));",
      func: `
        {
          const routeRecorderButton = document.createElement("button");

          routeRecorderButton.className = "button";
          routeRecorderButton.textContent = "Route Recorder";

          G.appendChild(routeRecorderButton);

          console.log("[Route Recorder] BUTTON CREATED");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
