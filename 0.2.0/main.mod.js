import {
  PolyMod,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {
    console.log("[Route Recorder] 0.2.0 LOADED");
  };
}

export let polyMod = new RouteRecorder();
