import { Link, useNavigate } from "@tanstack/react-router";
import logoUrl from "@/assets/kingsley-hub-logo.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Kingsley Hub logo"
            className="size-9 rounded-full object-cover ring-1 ring-primary/50"
          />
          <span className="font-display text-lg tracking-wide text-gold-gradient">KINGSLEY HUB LYRICS</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/projects">My projects</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
