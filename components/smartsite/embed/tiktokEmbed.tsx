import React, { useEffect, useRef } from "react";

const TikTokEmbed = ({ embedHtml }: { embedHtml: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const addTikTokScript = () => {
      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      containerRef.current?.appendChild(script);
    };

    // Clear the container and add the script on every render
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.innerHTML = embedHtml;
      addTikTokScript();
    }

    return () => {
      // Clean up the script
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [embedHtml]);

  return <div className="w-full " ref={containerRef} />;
};

export default TikTokEmbed;
