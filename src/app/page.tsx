import { PetMascotCTA } from "@/components/marketing/PetMascotCTA";
import { HeroSection } from "@/sections/HeroSection";
import { HomeExploreSection } from "@/sections/HomeExploreSection";
import { SearchSection } from "@/sections/SearchSection";
import { ServicesSection } from "@/sections/ServicesSection";
import { WhyChooseUsSection } from "@/sections/WhyChooseUsSection";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <PetMascotCTA />
      <HeroSection />
      <SearchSection />
      <ServicesSection />
      <WhyChooseUsSection />
      <HomeExploreSection />
    </div>
  );
}
