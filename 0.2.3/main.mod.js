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
          const test = document.createElement("div");

          test.textContent = "ROUTE RECORDER MIXIN HIT";
          test.style.position = "fixed";
          test.style.top = "20px";
          test.style.left = "20px";
          test.style.zIndex = "999999";
          test.style.background = "red";
          test.style.color = "white";
          test.style.padding = "10px";
          test.style.fontSize = "20px";

          document.body.appendChild(test);

          console.log("[Route Recorder] MIXIN HIT");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
