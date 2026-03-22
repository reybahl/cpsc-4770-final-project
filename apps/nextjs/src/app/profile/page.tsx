import { ContextInputForm } from "~/app/_components/context-input-form";
import { HydrateClient } from "~/trpc/server";

export default function ProfilePage() {
  return (
    <HydrateClient>
      <main className="container mx-auto flex min-h-screen flex-col px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Profile
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-base">
            Write your own notes and optionally add a résumé PDF. The structured
            profile is generated from notes plus the PDF (never copied into your
            notes)—use the table below to review what the agent sees.
          </p>
        </header>

        <div className="mx-auto w-full max-w-3xl">
          <ContextInputForm />
        </div>
      </main>
    </HydrateClient>
  );
}
