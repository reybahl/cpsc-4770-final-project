import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";

import { auth, getSession } from "~/auth/server";

export default async function SignUpPage(props: {
  searchParams: Promise<{ callbackURL?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect((await props.searchParams).callbackURL ?? "/context");
  }

  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Enter your details to get started
      </p>

      <form
        className="mt-6 flex flex-col gap-4"
        action={async (formData: FormData) => {
          "use server";
          const name = formData.get("name") as string;
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          const callbackURL =
            (formData.get("callbackURL") as string) || "/context";

          try {
            const res = await auth.api.signUpEmail({
              body: { name, email, password, callbackURL },
              headers: await headers(),
            });
            if ("user" in res) redirect(callbackURL);
          } catch (e) {
            redirect(
              `/sign-up?error=${encodeURIComponent(e instanceof Error ? e.message : "Sign up failed")}&callbackURL=${encodeURIComponent(callbackURL)}`,
            );
          }
          redirect("/sign-up");
        }}
      >
        <input
          type="hidden"
          name="callbackURL"
          value={searchParams.callbackURL ?? "/context"}
        />
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                autoComplete="name"
              />
            </FieldContent>
          </Field>
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
                minLength={8}
                placeholder="Min 8 characters"
                autoComplete="new-password"
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
          Sign up
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/sign-in${searchParams.callbackURL ? `?callbackURL=${encodeURIComponent(searchParams.callbackURL)}` : ""}`}
          className="text-primary font-medium underline underline-offset-4 hover:no-underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
