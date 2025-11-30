// components/LinkPreview.tsx
import { useEffect, useState } from "react";
import Image from "next/image";

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  siteName?: string;
}

export const LinkPreview = ({ url }: { url: string }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 mt-2 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error || !metadata) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-300 rounded-lg overflow-hidden mt-2 hover:border-blue-500 transition-colors"
    >
      {metadata.image && (
        <div className="relative w-full h-48 bg-gray-100">
          <Image
            src={metadata.image}
            alt={metadata.title || "Link preview"}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4">
        {metadata.siteName && (
          <p className="text-xs text-gray-500 mb-1">{metadata.siteName}</p>
        )}
        {metadata.title && (
          <h3 className="font-semibold text-sm mb-1 line-clamp-2">
            {metadata.title}
          </h3>
        )}
        {metadata.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
};
