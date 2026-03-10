import Link from "next/link";

import { Button } from "@acme/ui/button";

import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex w-full max-w-2xl items-center justify-between">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              Create <span className="text-primary">T3</span> Turbo
            </h1>
            <Button asChild variant="outline">
              <Link href="/context">FormAgent →</Link>
            </Button>
          </div>
          <AuthShowcase />
        </div>
      </main>
    </HydrateClient>
  );
}
