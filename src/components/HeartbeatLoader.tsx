import { cn } from "@/lib/utils";

interface HeartbeatLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function HeartbeatLoader({ className, size = "md" }: HeartbeatLoaderProps) {
  const dimensions = {
    sm: { height: "24px", width: "32px" },
    md: { height: "48px", width: "64px" },
    lg: { height: "72px", width: "96px" },
  };

  const { height, width } = dimensions[size];

  return (
    <div className={cn("loading flex items-center justify-center", className)}>
      <svg height={height} width={width} viewBox="0 0 64 48">
        <polyline
          id="back"
          points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
        />
        <polyline
          id="front"
          points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
        />
      </svg>
    </div>
  );
}
