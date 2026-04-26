"use client";
import { useEffect, useRef } from "react";

interface Props {
  seriesUid: string;
  sliceCount: number;
  frameUrlFn: (index: number) => string;
  label: string;
}

/**
 * Single Cornerstone.js v3 viewport rendered into a div.
 * Uses a simple image stack loaded from backend PNG frames.
 * Dynamic import with ssr:false is enforced by the parent MPRViewer.
 */
export function CornerstoneViewport({ seriesUid, sliceCount, frameUrlFn, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const viewportIdRef = useRef(`viewport-${seriesUid}-${label}`);

  useEffect(() => {
    if (!containerRef.current || sliceCount === 0) return;

    let mounted = true;

    async function setup() {
      const { initCornerstone } = await import("@/lib/cornerstone");
      await initCornerstone();

      const { RenderingEngine, Enums } = await import("@cornerstonejs/core");

      const engineId = `engine-${viewportIdRef.current}`;
      const engine = new RenderingEngine(engineId);
      engineRef.current = engine;

      const viewportInput = {
        viewportId: viewportIdRef.current,
        element: containerRef.current!,
        type: Enums.ViewportType.STACK,
      };
      engine.enableElement(viewportInput);

      const viewport = engine.getViewport(viewportIdRef.current) as any;

      // Build image ids using the backend PNG frame endpoint
      const imageIds = Array.from({ length: sliceCount }, (_, i) =>
        `web:${frameUrlFn(i)}`
      );

      await viewport.setStack(imageIds, Math.floor(sliceCount / 2));
      viewport.render();
    }

    setup().catch(console.error);

    return () => {
      mounted = false;
      engineRef.current?.destroy();
    };
  }, [seriesUid, sliceCount]);

  return (
    <div className="relative bg-black rounded overflow-hidden">
      <span className="absolute top-2 left-2 z-10 text-xs text-slate-400 bg-black/60 px-1 rounded">
        {label}
      </span>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: 200 }}
      />
    </div>
  );
}
