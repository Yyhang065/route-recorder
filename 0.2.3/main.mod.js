import {
  PolyMod,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

class RouteRecorder extends PolyMod {
  init = (pml) => {
    console.log("[Route Recorder] 0.6.3 INIT WORKED");
  };
}

export let polyMod = new RouteRecorder();
