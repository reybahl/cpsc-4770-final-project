import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@acme/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";

import { auth, getSession } from "~/auth/server";

export async function AuthShowcase() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignInForm />
        <SignUpForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <form>
        <Button
          size="lg"
          formAction={async () => {
            "use server";
            await auth.api.signOut({
              headers: await headers(),
            });
            redirect("/");
          }}
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}

function SignInForm() {
  return (
    <form
      className="flex flex-col gap-4"
      action={async (formData: FormData) => {
        "use server";
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        try {
          const res = await auth.api.signInEmail({
            body: { email, password, callbackURL: "/" },
            headers: await headers(),
          });
          if ("user" in res) redirect("/");
        } catch (e) {
          redirect(
            `/?error=${encodeURIComponent(e instanceof Error ? e.message : "Sign in failed")}`,
          );
        }
        redirect("/");
      }}
    >
      <h3 className="text-lg font-medium">Sign in</h3>
      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="signin-email">Email</FieldLabel>
            <Input
              id="signin-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="signin-password">Password</FieldLabel>
            <Input id="signin-password" name="password" type="password" required />
          </FieldContent>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg">
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  return (
    <form
      className="flex flex-col gap-4"
      action={async (formData: FormData) => {
        "use server";
        const name = formData.get("name") as string;
        const email = formData.get("signup-email") as string;
        const password = formData.get("signup-password") as string;
        try {
          const res = await auth.api.signUpEmail({
            body: { name, email, password, callbackURL: "/" },
            headers: await headers(),
          });
          if ("user" in res) redirect("/");
        } catch (e) {
          redirect(
            `/?error=${encodeURIComponent(e instanceof Error ? e.message : "Sign up failed")}`,
          );
        }
        redirect("/");
      }}
    >
      <h3 className="text-lg font-medium">Create account</h3>
      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="signup-name">Name</FieldLabel>
            <Input
              id="signup-name"
              name="name"
              type="text"
              required
              placeholder="Your name"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              id="signup-email"
              name="signup-email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <Input
              id="signup-password"
              name="signup-password"
              type="password"
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg">
        Sign up
      </Button>
    </form>
  );
}
