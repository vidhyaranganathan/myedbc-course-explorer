import Hero from "@/components/hero";
import Features from "@/components/features";
import ExampleSearches from "@/components/example-searches";
import TrustSection from "@/components/trust-section";
import CTA from "@/components/cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <ExampleSearches />
      <TrustSection />
      <CTA />
      <Footer />
    </main>
  );
}
