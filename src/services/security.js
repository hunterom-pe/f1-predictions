import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

/**
 * Returns the native Capacitor Device UUID or a persistent simulated Web UUID.
 * @returns {Promise<string>} Device UUID
 */
export async function getDeviceUuid() {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getId();
      return info.uuid;
    } catch (e) {
      console.error("Error getting Capacitor device ID:", e);
    }
  }
  // Web fallback: persistent simulated UUID stored in localStorage
  let uuid = localStorage.getItem("asl_device_uuid");
  if (!uuid) {
    uuid = "web_uuid_" + Math.random().toString(36).slice(2, 15);
    localStorage.setItem("asl_device_uuid", uuid);
  }
  return uuid;
}

/**
 * Programmatically enables native screenshot / app-switcher blocking.
 */
export async function enableScreenshotBlocking() {
  console.log("[Security Service] Enabling screenshot / app-switcher blocking...");
  if (Capacitor.isNativePlatform()) {
    try {
      // Dynamic import to prevent bundler errors if the plugin is not installed in npm
      const module = await import("@capacitor/privacy-screen");
      if (module && module.PrivacyScreen) {
        await module.PrivacyScreen.enable();
        console.log("[Security Service] Capacitor Native Privacy Screen Enabled.");
      }
    } catch (e) {
      console.warn("[Security Service] Native privacy screen plugin enable failed:", e);
    }
  }
}

/**
 * Programmatically disables native screenshot / app-switcher blocking.
 */
export async function disableScreenshotBlocking() {
  console.log("[Security Service] Disabling screenshot / app-switcher blocking...");
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import("@capacitor/privacy-screen");
      if (module && module.PrivacyScreen) {
        await module.PrivacyScreen.disable();
        console.log("[Security Service] Capacitor Native Privacy Screen Disabled.");
      }
    } catch (e) {
      console.warn("[Security Service] Native privacy screen plugin disable failed:", e);
    }
  }
}

/**
 * Registers browser event listeners to simulate screen-capture / screenshot detection on web.
 * Fires a callback when print shortcuts, OS captures, or app-focus blurs are triggered.
 * @param {Function} onDetection Callback function called with the trigger reason string
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupWebScreenshotDetector(onDetection) {
  if (Capacitor.isNativePlatform()) {
    return () => {}; // Native environment uses @capacitor/privacy-screen instead
  }

  const handleKeyDown = (e) => {
    const isPrintScreen = e.key === "PrintScreen";
    const isMacCapture = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4");
    const isCtrlP = e.ctrlKey && e.key === "p";

    if (isPrintScreen || isMacCapture || isCtrlP) {
      if (isCtrlP) {
        e.preventDefault();
      }
      console.log(`[Security Service] Intercepted print/screenshot keystroke shortcut: ${e.key}`);
      onDetection("key_shortcut");
    }
  };

  const handleVisibilityChange = () => {
    // Some mobile devices and browsers trigger a visibility change to 'hidden' when an OS screenshot overlay opens
    if (document.visibilityState === "hidden") {
      console.log("[Security Service] Window visibility changed to hidden. Triggering safety check.");
      onDetection("visibility_change");
    }
  };

  const handleBlur = () => {
    // Focus loss could happen if print preview, screen snip overlay, or system dialog opens
    console.log("[Security Service] Window lost focus (blur). Triggering safety check.");
    onDetection("window_blur");
  };

  window.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleBlur);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur);
  };
}
