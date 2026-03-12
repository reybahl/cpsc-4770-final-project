import { HydrateClient } from "~/trpc/server";
import { FormFillSection } from "./_components/form-fill-section";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container mx-auto flex min-h-screen flex-col px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            FormAgent
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-base">
            Enter a form URL. The agent will fill it using your saved context.
          </p>
        </header>

        <FormFillSection />
      </main>
    </HydrateClient>
  );
}
