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

/**
 * Uses Google Gemini API (with local fallback if API key is not configured) to moderate text.
 * Ensures posts and proofs are:
 * 1. On topic (missed connection details or validation replies)
 * 2. Do not contain vulgar sentences or toxic insults
 * 3. Are not random thoughts / spam
 * 
 * @param {string} text The content text to analyze
 * @param {string} contentType "post" or "proof"
 * @returns {Promise<{ approved: boolean, reason?: string }>}
 */
export async function moderateTextWithGemini(text, contentType = "post") {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("asl_gemini_api_key");
  
  if (!apiKey) {
    console.warn("Google Gemini API key not found in env (VITE_GEMINI_API_KEY) or localStorage (asl_gemini_api_key). Using local moderation fallback.");
    return runLocalModerationFallback(text, contentType);
  }

  try {
    const prompt = `You are a moderator for a nostalgic 2000s missed connection social network called "asl".
Analyze this text submitted as a ${contentType === "post" ? "missed connection post for a bar" : "verification proof reply to claim a post"}:
"${text}"

Evaluate if the text:
1. Is on-topic (describes an encounter/vibe/appearance/person at a venue, bar, or local spot, or details verifying who they are/how they met).
2. Does NOT contain vulgar sentences, extreme profanity, or toxic insults.
3. Is NOT just random thoughts, spam, or gibberish (e.g. "I like turtles", "Today is raining").
4. Does NOT contain doxxing, full names, phone numbers, email addresses, external links, or social media handles (like @username or instagram.com links).

If the text violates rule 4 (contains handles, phone numbers, links, names, or emails), set "category" to "doxxing".
If it violates rules 1, 2, or 3 (spam, cringe, off-topic, insults, profanity), set "category" to "spam".

You must reply with a valid JSON object in exactly this format:
{
  "approved": true/false,
  "category": "spam" | "doxxing" | ""
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text }]
        }],
        systemInstruction: {
          parts: [{ text: prompt }]
        },
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(responseText.trim());
    return {
      approved: !!parsed.approved,
      category: parsed.category || "spam"
    };
  } catch (err) {
    console.error("Gemini Moderation Error:", err);
    return runLocalModerationFallback(text, contentType);
  }
}

function runLocalModerationFallback(text, contentType) {
  const normalized = text.toLowerCase().trim();
  
  const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{7}\b|\b\d{10}\b/.test(text);
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text);
  const hasHandle = /@\w+/.test(text) || /\b(instagram|twitter|facebook|tiktok|snapchat)\.com\b/i.test(text);
  const hasUrl = /\b(https?:\/\/|www\.)\S+\b/i.test(text);

  if (hasPhone || hasEmail || hasHandle || hasUrl) {
    return {
      approved: false,
      category: "doxxing"
    };
  }

  if (normalized.length < 10) {
    return {
      approved: false,
      category: "spam"
    };
  }

  const profanityList = ["fuck", "bitch", "asshole", "bastard", "shit", "cunt", "dick", "slut", "whore", "idiot", "retard", "moron"];
  const hasProfanity = profanityList.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(normalized);
  });

  if (hasProfanity) {
    return {
      approved: false,
      category: "spam"
    };
  }

  const randomSpamPhrases = [
    "i like turtles", "today is raining", "testing 123", "hello world", 
    "lorem ipsum", "asd asd", "qwerty", "test post", "random text"
  ];
  if (randomSpamPhrases.includes(normalized) || normalized === "testing") {
    return {
      approved: false,
      category: "spam"
    };
  }

  if (contentType === "post") {
    const locationKeywords = ["bar", "venue", "saw you", "eyes", "wearing", "flannel", "glass", "hair", "booth", "jukebox", "drink", "table", "sitting", "spilled", "looked", "smiled"];
    const hasContext = locationKeywords.some(keyword => normalized.includes(keyword));
    if (!hasContext && normalized.split(" ").length < 6) {
      return {
        approved: false,
        category: "spam"
      };
    }
  }

  return { approved: true };
}
