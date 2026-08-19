import { useEffect, useRef } from "react";
import { drawFrame, type RenderLine } from "@/lib/renderer";
import type { StyleSettings } from "@/lib/themes";
import logo from "@/assets/kingsley-hub-logo.jpg.asset.json";

interface Props {
  timeMs: number;
  durationMs: number;
  lines: RenderLine[];
  style: StyleSettings;
  themeId: string;
  title: string;
  artist: string;
  aspect: string;
}

export function useLogoImage() {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logo.url;
    img.onload = () => {
      ref.current = img;
    };
  }, []);
  return ref;
}

export function PreviewStage(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useLogoImage();
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const p = propsRef.current;
        const width = p.aspect === "9:16" ? 540 : 960;
        const height = p.aspect === "9:16" ? 960 : 540;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        drawFrame(ctx, width, height, {
          timeMs: p.timeMs,
          durationMs: p.durationMs,
          lines: p.lines,
          style: p.style,
          themeId: p.themeId,
          title: p.title,
          artist: p.artist,
          logo: logoRef.current,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [logoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-border/70 bg-black"
      style={{ aspectRatio: props.aspect === "9:16" ? "9 / 16" : "16 / 9" }}
    />
  );
}
