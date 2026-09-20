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
          console.log("[Route Recorder] MIXIN WORKS");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
