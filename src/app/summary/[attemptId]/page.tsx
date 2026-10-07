import { SummaryScreen } from "@/components/SummaryScreen";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <SummaryScreen attemptId={attemptId} />;
}
