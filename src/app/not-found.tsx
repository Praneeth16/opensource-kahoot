import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-3xl font-bold">Nothing here</h1>
      <p className="text-navy-500">
        That game or quiz doesn&apos;t exist, or it isn&apos;t yours.
      </p>
      <Link className="btn-dark" href="/">
        Go home
      </Link>
    </main>
  );
}
