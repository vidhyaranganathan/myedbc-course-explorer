import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-gradient-to-r from-blue-600 to-teal-500">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Find Your Courses?
        </h2>

        <p className="text-xl text-blue-100 mb-10">
          Free to use. No account required.
        </p>

        <Link
          href="/search"
          className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
        >
          Start Searching
        </Link>

        <p className="mt-8 text-blue-100 text-sm">
          Works on any device &bull; Always free
        </p>
      </div>
    </section>
  );
}
