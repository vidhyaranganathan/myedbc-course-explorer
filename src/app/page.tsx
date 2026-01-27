import Hero from "@/components/hero";
import ProblemSolution from "@/components/problem-solution";
import Features from "@/components/features";
import HowItWorks from "@/components/how-it-works";
import ExampleSearches from "@/components/example-searches";
import TrustSection from "@/components/trust-section";
import CTA from "@/components/cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <ExampleSearches />
      <TrustSection />
      <CTA />
      <Footer />
    </main>
  );
}
