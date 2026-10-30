import type { Metadata } from "next";
import { BasilicoPage } from "@/components/basilico/BasilicoPage";

export const metadata: Metadata = {
  title: "Basilico — Fine Dining in Bangkok",
  description:
    "Seven courses. One fire. A cinematic fine-dining experience beneath candlelight. Reserve your evening at Basilico.",
};

export default function Page() {
  return <BasilicoPage />;
}
