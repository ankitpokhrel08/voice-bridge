import { useEffect, useState } from "react";
import { formatDuration } from "../lib/formatDuration";

export function useCallTimer(connectedAt: number | null): string {
  const [label, setLabel] = useState("00:00");

  useEffect(() => {
    if (connectedAt === null) {
      setLabel("00:00");
      return;
    }
    const tick = () => setLabel(formatDuration(Date.now() - connectedAt));
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [connectedAt]);

  return label;
}
