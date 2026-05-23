/**
 * BBCode parser for RetroConnect.
 * Safely escapes all HTML to prevent XSS, then translates BBCode tags into styled HTML.
 * @param {string} text Raw user input text
 * @returns {string} Safe HTML string
 */
export function parseBBCode(text) {
  if (!text) return "";

  // 1. Escape HTML special characters to prevent XSS injection completely
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />"); // convert newlines to linebreaks

  // 2. Bold [b] -> <strong>
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
  
  // 3. Italic [i] -> <em>
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
  
  // 4. Underline [u] -> <u>
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");

  // 5. Center [center] -> centered div
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, "<div style='text-align: center'>$1</div>");

  // 6. Monospace [mono] -> code snippet look
  html = html.replace(/\[mono\]([\s\S]*?)\[\/mono\]/gi, "<span style='font-family: monospace; background-color: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 2px;'>$1</span>");

  // 7. Color [color=pink] or [color=#ff00ff]
  html = html.replace(/\[color=([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/color\]/gi, (match, color, content) => {
    // Restrict color input to standard color words or valid hex values for safety
    if (/^[a-zA-Z]+$/.test(color) || /^#[a-fA-F0-9]{3,6}$/.test(color)) {
      return `<span style="color: ${color}">${content}</span>`;
    }
    return content;
  });

  // 8. Text size [size=10] to [size=24]
  html = html.replace(/\[size=([0-9]+)\]([\s\S]*?)\[\/size\]/gi, (match, size, content) => {
    const parsedSize = parseInt(size, 10);
    if (parsedSize >= 10 && parsedSize <= 28) {
      return `<span style="font-size: ${parsedSize}px">${content}</span>`;
    }
    return content;
  });

  // 9. Retro neon glow effect [glow=red] -> text-shadow styling
  html = html.replace(/\[glow=([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/glow\]/gi, (match, glowColor, content) => {
    if (/^[a-zA-Z]+$/.test(glowColor) || /^#[a-fA-F0-9]{3,6}$/.test(glowColor)) {
      return `<span style="text-shadow: 0 0 5px ${glowColor}, 0 0 10px ${glowColor}; color: inherit;">${content}</span>`;
    }
    return content;
  });

  // 10. Classic Netscape blink tag [blink]
  html = html.replace(/\[blink\]([\s\S]*?)\[\/blink\]/gi, "<span class='retro-blink'>$1</span>");

  return html;
}
