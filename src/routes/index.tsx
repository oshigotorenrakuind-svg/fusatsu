import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import LibraryApp from "@/components/library-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="fixed inset-0 bg-ink">
      <h1 className="sr-only">不殺</h1>
      {mounted ? (
        <LibraryApp />
      ) : (
        <canvas
          className="h-full w-full"
          aria-hidden
          style={{
            backgroundColor: "#0c0704",
            backgroundImage: "url(/textures/preload.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
    </main>
  );
}
