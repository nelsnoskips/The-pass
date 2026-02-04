"use client";

import { useEffect, useState } from "react";

/**
 * 11Labs conversational AI widget.
 * Replace the script URL below with your actual 11Labs script tag src.
 * If they give you a full <script> tag, use the src value only.
 * Example: "https://elevenlabs.io/convai-widget/..."
 */
const ELEVEN_LABS_SCRIPT_URL = "[PASTE_11LABS_SCRIPT_HERE]";

export function ChatWidget() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (
      !ELEVEN_LABS_SCRIPT_URL ||
      ELEVEN_LABS_SCRIPT_URL.startsWith("[PASTE")
    ) {
      return;
    }

    const script = document.createElement("script");
    script.src = ELEVEN_LABS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <div
      id="aesthetix-chat-container"
      className="fixed bottom-6 right-6 z-30 mb-[72px] md:mb-0"
      aria-hidden={!loaded}
    >
      {/* 11Labs script injects the chat UI here or at body level. If at body level, add CSS targeting their widget with bottom: 72px on mobile. */}
    </div>
  );
}
