import { PracticeScreen } from "@/components/PracticeScreen";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ essayId: string }>;
}) {
  const { essayId } = await params;
  return <PracticeScreen essayId={essayId} />;
}
