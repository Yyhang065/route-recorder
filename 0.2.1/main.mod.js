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
          console.log("[Route Recorder] MIXIN HIT");

          const button = document.createElement("button");

          button.className = "button";

          let enabled = true;

          const updateButton = () => {
            button.textContent = enabled
              ? "Enabled"
              : "Disabled";
          };

          button.addEventListener("click", () => {
            enabled = !enabled;
            updateButton();

            console.log(
              "[Route Recorder] Button:",
              enabled ? "Enabled" : "Disabled"
            );
          });

          k.appendChild(button);

          updateButton();

          console.log("[Route Recorder] BUTTON CREATED");
        }
      `,
    });
  };
}

export let polyMod = new RouteRecorder();
