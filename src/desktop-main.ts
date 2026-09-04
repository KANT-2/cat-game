import { DesktopWidgetApp } from "./app/DesktopWidgetApp";
import {
  focusDesktopWidget,
  listenDesktopWidgetCursor,
  setDesktopWidgetInputLocked,
  updateDesktopWidgetInteractionRegions,
} from "./app/desktopWidgetHost";
import "./style.css";

document.documentElement.dataset.displayMode = "desktop-widget";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

const widget = await DesktopWidgetApp.create(mount, {
  onFocusRequest: () => {
    void focusDesktopWidget().catch((error: unknown) => {
      console.error("Failed to focus the desktop widget", error);
    });
  },
  onInputLockChange: (locked) => {
    void setDesktopWidgetInputLocked(locked).catch((error: unknown) => {
      console.error("Failed to update the desktop widget input lock", error);
    });
  },
  onInteractionRegionsChange: updateDesktopWidgetInteractionRegions,
});

void listenDesktopWidgetCursor((position) => {
  widget.followCursor(position.x, position.y);
}).catch((error: unknown) => {
  console.error("Failed to listen for the desktop widget cursor", error);
});
