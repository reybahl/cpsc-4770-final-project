import { ContextInputForm } from "./_components/context-input-form";
import { FormFillSection } from "./_components/form-fill-section";

export default function ContextPage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          FormAgent
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-base">
          Start by providing your personal context. We’ll use this to
          automatically fill forms on your behalf.
        </p>
      </header>

      <ContextInputForm />
      <FormFillSection />
    </main>
  );
}
