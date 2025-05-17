'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  QrCode,
  Copy,
  Download,
  Send,
  CheckCircle2,
} from 'lucide-react';

export default function QrcodeGenerator() {
  const [url, setUrl] = useState('');
  const [qrGenerated, setQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateQR = () => {
    if (url.trim()) {
      setQrGenerated(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('qrcode');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const png = canvas.toDataURL('image/png');

          const link = document.createElement('a');
          link.href = png;
          link.download = 'qrcode.png';
          link.click();
          URL.revokeObjectURL(url);
        }
      };

      img.src = url;
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'QR Code',
          text: 'Check out this QR code',
          url: url,
        });
      }
    } catch (err) {}
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">QR</h2>
            <div className="space-y-4">
              <Input
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-gray-100 rounded-xl"
              />
              <Button
                onClick={handleGenerateQR}
                className="w-full bg-black hover:bg-gray-800"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Generate QR
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              {qrGenerated && url ? (
                <QRCodeSVG
                  id="qrcode"
                  value={url}
                  size={200}
                  level="H"
                  includeMargin
                  className="w-full h-auto border-black border-2 rounded-3xl"
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  QR Code
                </div>
              )}
            </div>

            {qrGenerated && url && (
              <div className="flex gap-2">
                <Button
                  variant="black"
                  size="icon"
                  onClick={handleCopy}
                  className="rounded-xl "
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="black"
                  size="icon"
                  onClick={handleDownload}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="black"
                  size="icon"
                  onClick={handleShare}
                  className="rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
