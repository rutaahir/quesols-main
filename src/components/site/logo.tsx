import logoImage from "@/assets/Quesoles.png";

export function Logo({ size = 50, className }: { size?: number; className?: string }) {
  const targetHeight = size * 2.35;
  return (
    <img
      src={logoImage}
      alt="Quesols Logo"
      className={`object-contain inline-block max-w-none ${className || ""}`}
      style={{ height: targetHeight, width: "auto" }}
    />
  );
}
