import Link from "next/link";

export default function ExampleSearches() {
  const examples = [
    "Grade 11 math",
    "AP courses",
    "Computer programming",
    "Prerequisites for calculus",
    "French immersion science",
    "Career preparation courses",
  ];

  return (
    <section className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
          Try searching for...
        </h2>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {examples.map((example, index) => (
            <Link
              key={index}
              href={`/search?q=${encodeURIComponent(example)}`}
              className="px-5 py-3 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all hover:scale-105"
            >
              {example}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
