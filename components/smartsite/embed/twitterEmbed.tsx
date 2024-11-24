import React, { useEffect, useRef } from "react";

const TwitterEmbed = ({ embedHtml }: { embedHtml: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const addTwitterScript = () => {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      containerRef.current?.appendChild(script);
    };

    // Clear the container and add the script on every render
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.innerHTML = embedHtml;
      addTwitterScript();
    }

    return () => {
      // Clean up the script
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [embedHtml]);

  return <div ref={containerRef} />;
};

export default TwitterEmbed;
