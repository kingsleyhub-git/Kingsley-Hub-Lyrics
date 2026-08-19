import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_STYLE } from "@/lib/themes";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "My lyric video projects — Kingsley Hub Lyrics" },
      { name: "description", content: "All your saved lyric video projects, ready to edit, sync and export." },
      { property: "og:title", content: "My lyric video projects — Kingsley Hub Lyrics" },
      { property: "og:description", content: "Open, edit and export your saved lyric videos." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const projects = useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,artist,theme_id,duration_ms,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user!.id,
          title: title.trim() || "Untitled track",
          artist: artist.trim(),
          style: DEFAULT_STYLE as unknown as Record<string, unknown>,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setOpen(false);
      setTitle("");
      setArtist("");
      navigate({ to: "/projects/$id", params: { id: data.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create project"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-gold-gradient">My projects</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New lyric video</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New lyric video</DialogTitle>
                <DialogDescription>Name the track — you can add audio and lyrics next.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Track title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Freaked Out" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist</Label>
                  <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Fat Papi" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? "Creating…" : "Create project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data?.map((p) => (
            <Card key={p.id} className="border-border/70">
              <CardHeader>
                <CardTitle className="font-display text-lg">{p.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.artist || "No artist set"}</p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild size="sm">
                  <Link to="/projects/$id" params={{ id: p.id }}>
                    Open studio
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.isSuccess && projects.data.length === 0 && (
          <p className="mt-16 text-center text-muted-foreground">
            No projects yet. Create your first lyric video above.
          </p>
        )}
      </main>
    </div>
  );
}
