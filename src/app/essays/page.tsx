import type { Metadata } from "next";
import { EssayList } from "@/components/EssayList";

export const metadata: Metadata = { title: "Danh sách đề" };

export default function EssaysPage() {
  return <EssayList />;
}
