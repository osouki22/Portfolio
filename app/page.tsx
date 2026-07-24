import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Work from "@/components/sections/Work";
import Contact from "@/components/sections/Contact";
import SideNav from "@/components/layout/SideNav";

export default function Home() {
  return (
    <main>
      <SideNav />
      <Hero />
      <About />
      <Work />
      <Contact />
    </main>
  );
}
