import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-8 px-6 md:px-12 lg:px-24 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <p className="text-gray-400">
            BC Course Finder &bull; Built for BC students
          </p>

          <nav className="flex items-center gap-6">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
          </nav>

          <p className="text-gray-500 text-center md:text-right">
            Not affiliated with BC Government &bull; Data from BC Ministry of Education
          </p>
        </div>
      </div>
    </footer>
  );
}
