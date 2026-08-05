import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-xl mx-auto mt-32 px-6 text-center">
      <h1 className="text-3xl font-semibold mb-3">Chat Organizer</h1>
      <p className="text-gray-600 mb-8">
        Turn your scattered Claude conversations into organized themes and clear next steps.
      </p>
      <Link
        href="/upload"
        className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
      >
        Get started
      </Link>
    </main>
  );
}
