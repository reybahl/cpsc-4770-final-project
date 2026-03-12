import { ContextInputForm } from "~/app/_components/context-input-form";
import { HydrateClient } from "~/trpc/server";

export default function ContextPage() {
  return (
    <HydrateClient>
      <main className="container mx-auto flex min-h-screen flex-col px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Personal context
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-base">
            Provide your personal context so the agent can fill forms on your
            behalf. Add a bio, or upload a PDF résumé for AI extraction.
          </p>
        </header>

        <ContextInputForm />
      </main>
    </HydrateClient>
  );
}
