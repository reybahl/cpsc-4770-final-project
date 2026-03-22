import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";

import { auth, getSession } from "~/auth/server";

export default async function SignInPage(props: {
  searchParams: Promise<{ callbackURL?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect((await props.searchParams).callbackURL ?? "/");
  }

  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Enter your email and password to continue
      </p>

      <form
        className="mt-6 flex flex-col gap-4"
        action={async (formData: FormData) => {
          "use server";
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          const callbackURL = (formData.get("callbackURL") as string) || "/";

          try {
            const res = await auth.api.signInEmail({
              body: { email, password, callbackURL },
              headers: await headers(),
            });
            if ("user" in res) redirect(callbackURL);
          } catch (e) {
            redirect(
              `/sign-in?error=${encodeURIComponent(e instanceof Error ? e.message : "Sign in failed")}&callbackURL=${encodeURIComponent(callbackURL)}`,
            );
          }
          redirect("/sign-in");
        }}
      >
        <input
          type="hidden"
          name="callbackURL"
          value={searchParams.callbackURL ?? "/"}
        />
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href={`/sign-up${searchParams.callbackURL ? `?callbackURL=${encodeURIComponent(searchParams.callbackURL)}` : ""}`}
          className="text-primary font-medium underline underline-offset-4 hover:no-underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
