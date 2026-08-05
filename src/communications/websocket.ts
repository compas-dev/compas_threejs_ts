import { dispatchMessage } from "./messages";

let websocket: WebSocket | null = null;
let connectionEnabled = false;

export function initializeWebSocketConnection(): void {
  connectionEnabled = true;
  // Read parameters from the current browser URL
  const urlParams = new URLSearchParams(window.location.search);
  const customHost = urlParams.get("ws_host") || "127.0.0.1";
  const customPort = urlParams.get("ws_port") || "9001";

  // ✨ Extract the workspace parameter dynamically (defaulting to 'main')
  const workspaceId = urlParams.get("workspace") || "main";

  // ✨ Construct the dynamic websocket including the workspace parameter
  const wsUrl = `ws://${customHost}:${customPort}/ws?workspace=${workspaceId}`;

  const connect = () => {
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    websocket = new WebSocket(wsUrl);
    websocket.binaryType = "arraybuffer";

    websocket.onopen = () => {
      if (!sessionStorage.getItem("reloaded")) {
        sessionStorage.setItem("reloaded", "true");
        window.location.reload();
      }
    };

    websocket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Handle binary COMPAS elements / 3D geometries
        const uint8 = new Uint8Array(event.data);
        dispatchMessage(uint8);
      } else if (typeof event.data === "string") {
        // ✨ Handle text-based updates sent via backend send_json (UI configurations, themes, views)
        try {
          const jsonData = JSON.parse(event.data);
          // If your dispatchMessage expects a Uint8Array, pass text data to its own handler,
          // or cast it here if your message pipeline handles parsed objects.
          console.log("⚡ Received JSON config update:", jsonData);

          // Depending on how dispatchMessage works internally, you can map it or handle UI changes here:
          // e.g., if it takes plain objects or needs conversion:
          // dispatchMessage(jsonData);
        } catch (error) {
          console.error(
            "❌ Failed to parse incoming WebSocket text message:",
            error,
          );
        }
      } else {
        console.warn("❓ Received unknown data format:", event.data);
      }
    };

    websocket.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      sessionStorage.removeItem("reloaded");
      setTimeout(connect, 1000); // Attempt to reconnect after 1 second
    };
  };
  connect();
}

export function sendWebSocketMessage(message: ArrayBuffer): boolean {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(message);
    return true;
  } else if (connectionEnabled) {
    console.error("WebSocket is not open. Unable to send message.");
  }
  return false;
}

export function sendDataMessage(data: Record<string, any>): boolean {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    try {
      console.log(data);
      const jsonString = JSON.stringify(data);
      websocket.send(jsonString);
      return true;
    } catch (error) {
      console.error("Failed to send data:", error);
      return false;
    }
  } else if (connectionEnabled) {
    console.error("WebSocket is not open. Unable to send message.");
  }
  return false;
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  return uint8Array.buffer;
}

export function dictionaryToArrayBuffer(
  data: Record<string, any>,
): ArrayBuffer {
  const jsonString = JSON.stringify(data);
  return stringToArrayBuffer(jsonString);
}
