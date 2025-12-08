import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl md:text-4xl font-bold">Page not found</h1>
          <p className="mt-2 text-muted-foreground">
            The page you are looking for doesn’t exist or may have been moved.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}