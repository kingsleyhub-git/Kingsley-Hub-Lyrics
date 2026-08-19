import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { drawFrame, resolutionFor, type RenderLine } from "@/lib/renderer";
import type { StyleSettings } from "@/lib/themes";
import logoUrl from "@/assets/kingsley-hub-logo.jpg";

interface Props {
  projectId: string;
  userId: string;
  title: string;
  artist: string;
  aspect: string;
  themeId: string;
  style: StyleSettings;
  lines: RenderLine[];
  audioUrl: string | null;
}

function pickMimeType() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

export function ExportPanel(props: Props) {
  const [quality, setQuality] = useState<"720p" | "1080p">("1080p");
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  async function render() {
    if (!props.audioUrl) {
      toast.error("Upload the audio first.");
      return;
    }
    setRendering(true);
    setProgress(0);
    try {
      await document.fonts.ready;
      const audioResponse = await fetch(props.audioUrl);
      const audioData = await audioResponse.arrayBuffer();
      const audioCtx = new AudioContext();
      const buffer = await audioCtx.decodeAudioData(audioData);

      const { width, height } = resolutionFor(props.aspect, quality);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const logo = await loadLogo();

      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(dest);

      const stream = canvas.captureStream(30);
      dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: quality === "1080p" ? 8_000_000 : 4_000_000,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      const durationMs = buffer.duration * 1000;
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start(1000);
      const startAt = audioCtx.currentTime + 0.1;
      source.start(startAt);

      await new Promise<void>((resolve) => {
        const tick = () => {
          const timeMs = Math.max(0, (audioCtx.currentTime - startAt) * 1000);
          drawFrame(ctx, width, height, {
            timeMs,
            durationMs,
            lines: props.lines,
            style: props.style,
            themeId: props.themeId,
            title: props.title,
            artist: props.artist,
            logo,
          });
          setProgress(Math.min(100, (timeMs / durationMs) * 100));
          if (timeMs >= durationMs) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      recorder.stop();
      source.stop();
      const blob = await finished;
      await audioCtx.close();

      const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const safeName = `${props.title || "lyric-video"}`.replace(/[^a-z0-9\-_ ]/gi, "").trim() || "lyric-video";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeName}.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);

      const path = `${props.userId}/${props.projectId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("renders")
        .upload(path, blob, { contentType: mimeType });
      if (!uploadError) {
        await supabase.from("renders").insert({
          project_id: props.projectId,
          user_id: props.userId,
          storage_path: path,
          resolution: quality,
          mime_type: mimeType,
          size_bytes: blob.size,
        });
      }
      toast.success("Video exported and downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setRendering(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Resolution</Label>
        <Select value={quality} onValueChange={(v) => setQuality(v as "720p" | "1080p")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="720p">720p — faster, smaller file</SelectItem>
            <SelectItem value="1080p">1080p — full HD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Rendering happens in this tab in real time — keep it open and in the foreground until it finishes.
      </p>
      {rendering && <Progress value={progress} />}
      <Button className="w-full" onClick={render} disabled={rendering}>
        {rendering ? `Rendering… ${Math.round(progress)}%` : "Render & download video"}
      </Button>
    </div>
  );
}
