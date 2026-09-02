```js
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
          button.textContent = "ROUTE RECORDER TEST";

          button.addEventListener("click", () => {
            button.textContent = "IT WORKS!";
          });

          k.appendChild(button);

          console.log("[Route Recorder] TEST BUTTON CREATED");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
```
