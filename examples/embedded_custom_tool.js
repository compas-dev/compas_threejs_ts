import { defineComponent, h, ref } from "vue";
import { Box, pbDumpBytes } from "@gramaziokohler/compas-pb-ts";

import { createViewer, useViewerMessaging } from "../dist-lib/index.js";
import {
  Button,
  Kbd,
  KbdGroup,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../dist-lib/ui.js";

// A toolbar tool authored exactly the way a consumer would: a Vue component
// built from the public ui kit (`@compas-dev/compas-threejs-ts/ui`) and
// `useViewerMessaging()`, with no access to viewer internals. It's passed
// into `toolbarTools` below rather than forking Toolbar.vue.
const PingTool = defineComponent({
  name: "PingTool",
  setup() {
    const pingCount = ref(0);
    const { sendData } = useViewerMessaging();

    function handleClick() {
      pingCount.value += 1;
      sendData({
        dispatch: "other_action",
        action: "ping",
        count: pingCount.value,
      });
    }

    return () =>
      h(TooltipProvider, { delayDuration: 600 }, () =>
        h(Tooltip, null, () => [
          h(TooltipTrigger, null, () =>
            h(
              Button,
              {
                variant: "secondary",
                size: "icon",
                "data-testid": "ping-tool-button",
                onClick: handleClick,
              },
              () => "Hi",
            ),
          ),
          h(TooltipContent, { side: "bottom" }, () => [
            h("p", null, `Sent ${pingCount.value} ping(s)`),
            h(KbdGroup, null, () => [h(Kbd, null, () => "click")]),
          ]),
        ]),
      );
  },
});

const container = document.querySelector("#viewer");
if (!(container instanceof HTMLElement)) {
  throw new Error("Viewer container was not found");
}

// Messages sent by tools via `useViewerMessaging()` are routed through this
// `send` option instead of a real backend connection - the same hook a
// consumer would use to wire up their own transport.
const outgoingMessages = [];

const viewer = createViewer(container, {
  mode: "embedded",
  defaultLighting: true,
  showToolbar: true,
  toolbarTools: [{ id: "ping-tool", component: PingTool, order: 10 }],
  send(message) {
    outgoingMessages.push(message);
    return true;
  },
  onError(error) {
    console.error(error.code, error.message, error.details);
  },
});

const box = new Box({
  data: {
    guid: crypto.randomUUID(),
    name: "Box",
    frame: {
      point: { x: 0, y: 0, z: 0 },
      xaxis: { x: 1, y: 0, z: 0 },
      yaxis: { x: 0, y: 1, z: 0 },
    },
    xsize: 3,
    ysize: 3,
    zsize: 1,
  },
});
viewer.dispatch(pbDumpBytes(box));

document.body.dataset.exampleReady = "true";
window.__compasCustomTool = { viewer, outgoingMessages };
window.addEventListener("pagehide", () => viewer.dispose(), { once: true });
