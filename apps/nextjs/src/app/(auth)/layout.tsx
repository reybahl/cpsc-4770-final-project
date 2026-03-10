export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {props.children}
    </div>
  );
}
