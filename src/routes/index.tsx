import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/kingsley-hub-logo.jpg.asset.json";
import { THEMES } from "@/lib/themes";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kingsley Hub Lyrics — Animated Lyric Video Maker" },
      {
        name: "description",
        content:
          "Upload your song, import lyrics from Word, tap-sync every line and export an animated lyric video in your own theme.",
      },
      { property: "og:title", content: "Kingsley Hub Lyrics — Animated Lyric Video Maker" },
      {
        property: "og:description",
        content: "Audio in, Word lyrics in, a branded animated lyric video out. Engineered for digital mastery.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { title: "Upload the audio", body: "Drop in your mp3, wav or m4a. The track powers preview and export." },
  { title: "Import the lyrics", body: "Bring in a Word (.docx) file — every paragraph becomes an editable line." },
  { title: "Tap-sync to the beat", body: "Play the song and tap the spacebar to stamp each line. Nudge to perfect." },
  { title: "Style and export", body: "Pick a theme, fonts and animation, then render and download your video." },
];

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(232,185,59,0.18),transparent_60%)]" />
          <div className="relative mx-auto max-w-5xl px-4 py-20 text-center">
            <img
              src={logo.url}
              alt="Kingsley Hub — Engineered for Digital Mastery"
              className="mx-auto size-32 rounded-full object-cover ring-2 ring-primary/40"
            />
            <h1 className="mt-8 font-display text-4xl leading-tight text-gold-gradient sm:text-6xl">
              Kingsley Hub Lyrics
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Turn a song and a Word document into a fully animated lyric video. Sync every line by ear, style it in
              your theme, and download the finished file.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/projects" : "/auth"}>{user ? "Open the studio" : "Start creating"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/projects">My projects</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="font-display text-2xl text-foreground">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="border-border/70">
                <CardContent className="pt-6">
                  <span className="font-display text-3xl text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <h2 className="font-display text-2xl text-foreground">Animated themes</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {THEMES.map((theme) => (
              <Card key={theme.id} className="overflow-hidden border-border/70">
                <div
                  className="h-28 w-full"
                  style={{ background: `radial-gradient(circle at 50% 40%, ${theme.bg[0]}, ${theme.bg[1]})` }}
                >
                  <div className="h-full w-full" style={{ background: `linear-gradient(120deg, transparent 40%, ${theme.sweep} 60%, transparent 80%)` }} />
                </div>
                <CardContent className="pt-4">
                  <h3 className="text-base font-semibold">{theme.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Kingsley Hub — Engineered For Digital Mastery
      </footer>
    </div>
  );
}
