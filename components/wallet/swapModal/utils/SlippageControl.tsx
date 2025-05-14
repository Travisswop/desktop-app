import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';

interface SlippageControlProps {
  slippage: number;
  setSlippage: (slippage: number) => void;
}

export default function SlippageControl({
  slippage,
  setSlippage,
}: SlippageControlProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(slippage.toString());
  const [showSettings, setShowSettings] = useState(false);

  const presets = [
    { label: '0.1%', value: 10 },
    { label: '0.5%', value: 50 },
    { label: '1.0%', value: 100 },
  ];

  const handlePresetClick = (value: number) => {
    setSlippage(value);
    setIsCustom(false);
  };

  const handleCustomChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setCustomValue(value);

    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      // Convert percentage to basis points (1% = 100 basis points)
      setSlippage(Math.floor(numericValue * 100));
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1 text-xs"
      >
        <Settings className="w-3 h-3" />
        <span>Slippage: {(slippage / 100).toFixed(1)}%</span>
      </Button>

      {showSettings && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg p-3 z-50 w-60 border border-gray-200 top-full">
          <div className="text-sm font-medium mb-2">
            Slippage Tolerance
          </div>
          <div className="flex gap-2 mb-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={
                  slippage === preset.value && !isCustom
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant={isCustom ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setIsCustom(true)}
            >
              Custom
            </Button>
            {isCustom && (
              <div className="flex items-center flex-1">
                <Input
                  type="number"
                  value={customValue}
                  onChange={handleCustomChange}
                  className="h-8 text-xs"
                  min="0.1"
                  step="0.1"
                />
                <span className="ml-1">%</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Your transaction will revert if the price changes
            unfavorably by more than this percentage.
          </div>
        </div>
      )}
    </div>
  );
}
