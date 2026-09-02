import {
  PolyMod,
  MixinType,
} from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const state = {
  recording: false,
  points: [],
  button: null,
};

function startRecording() {
  state.recording = true;
  state.points = [];

  if (state.button) {
    state.button.textContent = "Don't Record Next Run";
  }
}

function stopRecording() {
  state.recording = false;

  if (state.button) {
    state.button.textContent = "Record Next Run";
  }
}

class RouteRecorder extends PolyMod {
  init = (pml) => {
    pml.registerChunkMixin("112.bundle.js", {
      type: MixinType.INSERT,
      token: "k.appendChild(C));",
      func: `
        {
          const rr = globalThis.__routeRecorder;

          if (!rr.button && typeof k?.appendChild === "function") {
            const button = document.createElement("button");

            button.className = "button";
            button.textContent = "Record Next Run";

            button.addEventListener("click", () => {
              if (rr.recording) {
                rr.stopRecording();
              } else {
                rr.startRecording();
              }
            });

            rr.button = button;
            k.appendChild(button);
          }
        }
      `,
    });
  };
}

globalThis.__routeRecorder = state;
state.startRecording = startRecording;
state.stopRecording = stopRecording;

export let polyMod = new RouteRecorder();
