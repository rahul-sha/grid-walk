import CarouselView from "@/components/gridwalk/CarouselView";

// The carousel, also at /carousel: the snapshot capture script renders its
// cards from here (?noSnapshot=1), whichever view a visitor picked.
export default async function Carousel({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; noSnapshot?: string }>;
}) {
  return <CarouselView params={await searchParams} />;
}
