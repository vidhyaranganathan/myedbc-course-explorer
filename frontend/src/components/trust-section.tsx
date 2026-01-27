export default function TrustSection() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-blue-50">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
          BC Ministry of Education
        </p>

        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Official Course Data You Can Trust
        </h2>

        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          BC Course Finder uses the official BC Ministry of Education Course Registry.
          All course codes, descriptions, and requirements come directly from the
          provincial database, updated for the 2024/25 school year.
        </p>

        <a
          href="https://curriculum.gov.bc.ca/course-search"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          View original BC course registry
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </section>
  );
}
