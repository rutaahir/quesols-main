import React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ColorPickerSwatchesProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  { name: "Brand Purple", hex: "#7C3AED" },
  { name: "Classic Indigo", hex: "#4F46E5" },
  { name: "Ocean Blue", hex: "#2563EB" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Vibrant Rose", hex: "#E11D48" },
  { name: "Warm Amber", hex: "#D97706" },
  { name: "Deep Slate", hex: "#1E293B" },
];

export function ColorPickerSwatches({ color, onChange, className }: ColorPickerSwatchesProps) {
  const normalizedColor = color || "#7C3AED";

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith("#")) {
      val = `#${val}`;
    }
    onChange(val);
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Primary Accent Color
        </label>
        <span className="text-[11px] font-mono text-muted-foreground uppercase font-medium">
          {normalizedColor}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Native picker + Hex box */}
        <div className="flex items-center gap-2 h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="relative h-6 w-6 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
            <input
              type="color"
              value={normalizedColor.length === 7 ? normalizedColor : "#7C3AED"}
              onChange={(e) => onChange(e.target.value)}
              className="absolute -top-2 -left-2 h-10 w-10 cursor-pointer border-0 p-0"
              title="Pick custom color"
            />
          </div>
          <Input
            value={normalizedColor}
            onChange={handleHexChange}
            maxLength={7}
            className="h-7 w-20 px-1 border-0 bg-transparent text-xs font-mono font-semibold uppercase focus-visible:ring-0"
            placeholder="#7C3AED"
          />
        </div>

        {/* Preset swatches */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_COLORS.map((preset) => {
            const isSelected = normalizedColor.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => onChange(preset.hex)}
                className={cn(
                  "h-8 w-8 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer border-2 relative",
                  isSelected
                    ? "border-slate-900 dark:border-white scale-110 shadow-sm"
                    : "border-transparent hover:scale-105 opacity-85 hover:opacity-100"
                )}
                style={{ backgroundColor: preset.hex }}
                title={`${preset.name} (${preset.hex})`}
              >
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
