import type { SVGProps } from "react";

/** Small hand-drawn line-icon set, stroke-based, currentColor-driven so each
 * consumer controls color via CSS. Kept deliberately simple/consistent
 * rather than pulling in an icon library for a handful of controls. */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4.5c0-.6.5-1 1-1h2.4c.5 0 .9.3 1 .8l.9 3.3c.1.4 0 .9-.3 1.2l-1.6 1.5a13 13 0 0 0 5.8 5.8l1.5-1.6c.3-.3.8-.4 1.2-.3l3.3.9c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1.5C10.5 20 4 13.5 4 5.5V4.5Z" />
    </svg>
  );
}

export function PhoneOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4.5c0-.6.5-1 1-1h2.4c.5 0 .9.3 1 .8l.9 3.3c.1.4 0 .9-.3 1.2l-1.6 1.5a13 13 0 0 0 5.8 5.8l1.5-1.6c.3-.3.8-.4 1.2-.3l3.3.9c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1.5C10.5 20 4 13.5 4 5.5V4.5Z" />
      <path d="M3 3l18 18" strokeWidth={2} />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5.5A3 3 0 0 1 15 7v5c0 .4-.05.8-.15 1.15" />
      <path d="M9 9v3a3 3 0 0 0 4.6 2.55" />
      <path d="M5 11a7 7 0 0 0 10.5 6.05" />
      <path d="M19 11a7 7 0 0 1-1.1 3.75" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
      <path d="M3 3l18 18" strokeWidth={2} />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="12" height="12" rx="2.5" />
      <path d="M15 10.5 21 7v10l-6-3.5Z" />
    </svg>
  );
}

export function VideoOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 10.5 21 7v10l-6-3.5Z" />
      <path d="M3 8.5V16a2.5 2.5 0 0 0 2.5 2.5h6" />
      <path d="M9 6h4.5A2.5 2.5 0 0 1 16 8.5v.5" />
      <path d="M3 3l18 18" strokeWidth={2} />
    </svg>
  );
}

export function ScreenShareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M12 7v5" />
      <path d="M9.5 9.5 12 7l2.5 2.5" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4h-1A2.5 2.5 0 0 1 4 13.5v-7Z" />
      <path d="M8.5 9h7" />
      <path d="M8.5 12.5h4.5" />
    </svg>
  );
}

export function CaptionsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6" />
      <path d="M16.5 10.2a2.2 2.2 0 1 0 0 3.6" />
    </svg>
  );
}

export function GithubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.9-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
