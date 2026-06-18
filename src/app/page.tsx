import { HeroSection } from "@/sections/HeroSection";
import { HomeExploreSection } from "@/sections/HomeExploreSection";
import { SearchSection } from "@/sections/SearchSection";
import { ServicesSection } from "@/sections/ServicesSection";
import { DogStoryCtaSection } from "@/sections/DogStoryCtaSection";
import { HomeReadyCtaSection } from "@/sections/HomeReadyCtaSection";
import { WhyChooseUsSection } from "@/sections/WhyChooseUsSection";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <SearchSection />
      <ServicesSection />
      <WhyChooseUsSection />
      <DogStoryCtaSection />
      <HomeReadyCtaSection />
      <HomeExploreSection />
    </div>
  );
}
