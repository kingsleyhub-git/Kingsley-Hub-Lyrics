import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { PreviewStage } from "@/components/studio/PreviewStage";
import { ExportPanel } from "@/components/studio/ExportPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { parseDocxLines, linesFromPlainText } from "@/lib/docx";
import { THEMES, DEFAULT_STYLE, mergeStyle, type StyleSettings } from "@/lib/themes";
import type { RenderLine } from "@/lib/renderer";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Lyric studio — Kingsley Hub Lyrics" },
      { name: "description", content: "Sync lyrics to your audio, style the animation and export your lyric video." },
      { property: "og:title", content: "Lyric studio — Kingsley Hub Lyrics" },
      { property: "og:description", content: "Edit lyrics, tap-sync timing, choose a theme and render the video." },
    ],
  }),
  component: StudioPage,
});

interface EditableLine {
  text: string;
  startMs: number | null;
  kind: string;
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function StudioPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [themeId, setThemeId] = useState("kingsley-gold");
  const [style, setStyle] = useState<StyleSettings>(DEFAULT_STYLE);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkText, setBulkText] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const project = useQuery({
    queryKey: ["project", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: lineRows, error: lineError } = await supabase
        .from("lyric_lines")
        .select("text,start_ms,kind,position")
        .eq("project_id", id)
        .order("position");
      if (lineError) throw lineError;
      return { project: data, lines: lineRows };
    },
  });

  useEffect(() => {
    const data = project.data;
    if (!data) return;
    setTitle(data.project.title);
    setArtist(data.project.artist);
    setAspect(data.project.aspect);
    setThemeId(data.project.theme_id);
    setStyle(mergeStyle(data.project.style));
    setAudioPath(data.project.audio_path);
    setLines(data.lines.map((l) => ({ text: l.text, startMs: l.start_ms, kind: l.kind })));
  }, [project.data]);

  useEffect(() => {
    let cancelled = false;
    if (!audioPath) {
      setAudioUrl(null);
      return;
    }
    supabase.storage
      .from("audio")
      .createSignedUrl(audioPath, 60 * 60 * 6)
      .then(({ data }) => {
        if (!cancelled) setAudioUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [audioPath]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setTimeMs(audio.currentTime * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const renderLines: RenderLine[] = useMemo(
    () => lines.map((l) => ({ text: l.text, startMs: l.startMs, kind: l.kind })),
    [lines],
  );

  const stamp = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Math.round(audio.currentTime * 1000);
    setLines((prev) => {
      if (cursor >= prev.length) return prev;
      const next = [...prev];
      next[cursor] = { ...next[cursor]!, startMs: ms };
      return next;
    });
    setCursor((c) => Math.min(c + 1, lines.length));
  }, [cursor, lines.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        stamp();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stamp]);

  async function handleAudio(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("audio").upload(path, file, { contentType: file.type });
      if (error) throw error;
      await supabase.from("projects").update({ audio_path: path, audio_name: file.name }).eq("id", id);
      setAudioPath(path);
      toast.success("Audio uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDocx(file: File) {
    try {
      const parsed = file.name.toLowerCase().endsWith(".docx")
        ? await parseDocxLines(file)
        : linesFromPlainText(await file.text());
      if (!parsed.length) {
        toast.error("No lyric lines found in that file.");
        return;
      }
      setLines(parsed.map((text) => ({ text, startMs: null, kind: "line" })));
      setCursor(0);
      toast.success(`${parsed.length} lines imported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that document");
    }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title,
          artist,
          aspect,
          theme_id: themeId,
          style: style as unknown as Json,
          duration_ms: Math.round(durationMs),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      const { error: deleteError } = await supabase.from("lyric_lines").delete().eq("project_id", id);
      if (deleteError) throw deleteError;
      if (lines.length) {
        const { error: insertError } = await supabase.from("lyric_lines").insert(
          lines.map((line, index) => ({
            project_id: id,
            user_id: user.id,
            position: index,
            text: line.text,
            start_ms: line.startMs,
            kind: line.kind,
          })),
        );
        if (insertError) throw insertError;
      }
      toast.success("Project saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index: number, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(ms: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, ms / 1000);
    setTimeMs(Math.max(0, ms));
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-gold-gradient">{title || "Lyric studio"}</h1>
            <p className="text-sm text-muted-foreground">{artist || "Set the artist in Details"}</p>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save project"}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <PreviewStage
              timeMs={timeMs}
              durationMs={durationMs || 1}
              lines={renderLines}
              style={style}
              themeId={themeId}
              title={title}
              artist={artist}
              aspect={aspect}
            />
            <audio
              ref={audioRef}
              src={audioUrl ?? undefined}
              onLoadedMetadata={(e) => setDurationMs(e.currentTarget.duration * 1000)}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
            <div className="space-y-3 rounded-lg border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={togglePlay} disabled={!audioUrl}>
                  {playing ? "Pause" : "Play"}
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatTime(timeMs)} / {formatTime(durationMs)}
                </span>
                <Button size="sm" variant="outline" onClick={stamp} disabled={!audioUrl || cursor >= lines.length}>
                  Tap sync (Space)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCursor(0)}>
                  Reset cursor
                </Button>
              </div>
              <Slider
                value={[Math.min(timeMs, durationMs)]}
                max={Math.max(durationMs, 1)}
                step={100}
                onValueChange={([v]) => seek(v ?? 0)}
              />
              <p className="text-xs text-muted-foreground">
                Next line to stamp: {lines[cursor]?.text ?? "— all lines timed —"}
              </p>
            </div>
          </div>

          <Tabs defaultValue="lyrics">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="lyrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import lyrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    type="file"
                    accept=".docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleDocx(file);
                    }}
                  />
                  <Textarea
                    rows={4}
                    placeholder="…or paste lyrics here, one line per row"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const parsed = linesFromPlainText(bulkText);
                      if (!parsed.length) return toast.error("Nothing to import");
                      setLines(parsed.map((text) => ({ text, startMs: null, kind: "line" })));
                      setCursor(0);
                      setBulkText("");
                      toast.success(`${parsed.length} lines imported`);
                    }}
                  >
                    Use pasted lyrics
                  </Button>
                </CardContent>
              </Card>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className={`rounded-md border p-2 ${index === cursor ? "border-primary" : "border-border/70"}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-16 shrink-0 text-left text-xs tabular-nums text-muted-foreground hover:text-primary"
                        onClick={() => line.startMs !== null && seek(line.startMs)}
                      >
                        {line.startMs === null ? "--:--" : formatTime(line.startMs)}
                      </button>
                      <Input
                        value={line.text}
                        onChange={(e) => updateLine(index, { text: e.target.value })}
                        onFocus={() => setCursor(index)}
                        className="h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => updateLine(index, { startMs: Math.round(timeMs) })}>
                        Set
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => updateLine(index, { startMs: Math.max(0, (line.startMs ?? 0) - 100) })}
                      >
                        -0.1s
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => updateLine(index, { startMs: (line.startMs ?? 0) + 100 })}
                      >
                        +0.1s
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => updateLine(index, { kind: line.kind === "line" ? "gap" : "line" })}
                      >
                        {line.kind === "line" ? "Mark as break" : "Mark as line"}
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, { text: "New line", startMs: null, kind: "line" }])}
                >
                  Add line
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Track audio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    type="file"
                    accept="audio/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAudio(file);
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    {audioPath ? "Audio attached to this project." : "No audio yet — upload mp3, wav or m4a."}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="p-title">Track title</Label>
                    <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-artist">Artist</Label>
                    <Input id="p-artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Theme & animation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background theme</Label>
                    <Select value={themeId} onValueChange={setThemeId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Aspect ratio</Label>
                    <Select value={aspect} onValueChange={setAspect}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 — YouTube</SelectItem>
                        <SelectItem value="9:16">9:16 — Reels / Shorts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Line animation</Label>
                    <Select
                      value={style.animation}
                      onValueChange={(v) => setStyle({ ...style, animation: v as StyleSettings["animation"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade up</SelectItem>
                        <SelectItem value="slide">Slide in</SelectItem>
                        <SelectItem value="wipe">Wipe reveal</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Font</Label>
                    <Select
                      value={style.font}
                      onValueChange={(v) => setStyle({ ...style, font: v as StyleSettings["font"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display">Display (Cinzel)</SelectItem>
                        <SelectItem value="sans">Sans (Montserrat)</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="mono">Mono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Text colour</Label>
                    <Select
                      value={style.palette}
                      onValueChange={(v) => setStyle({ ...style, palette: v as StyleSettings["palette"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Kingsley gold</SelectItem>
                        <SelectItem value="white">Pure white</SelectItem>
                        <SelectItem value="blue">Wave blue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Text size — {style.fontScale.toFixed(2)}x</Label>
                    <Slider
                      value={[style.fontScale]}
                      min={0.6}
                      max={1.8}
                      step={0.05}
                      onValueChange={([v]) => setStyle({ ...style, fontScale: v ?? 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo watermark</Label>
                    <Select
                      value={style.watermark}
                      onValueChange={(v) => setStyle({ ...style, watermark: v as StyleSettings["watermark"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Hidden</SelectItem>
                        <SelectItem value="top-left">Top left</SelectItem>
                        <SelectItem value="top-right">Top right</SelectItem>
                        <SelectItem value="bottom-left">Bottom left</SelectItem>
                        <SelectItem value="bottom-right">Bottom right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Render your video</CardTitle>
                </CardHeader>
                <CardContent>
                  {user && (
                    <ExportPanel
                      projectId={id}
                      userId={user.id}
                      title={title}
                      artist={artist}
                      aspect={aspect}
                      themeId={themeId}
                      style={style}
                      lines={renderLines}
                      audioUrl={audioUrl}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
