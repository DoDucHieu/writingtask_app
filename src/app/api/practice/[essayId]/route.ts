import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildPracticeState } from "@/lib/practice-state";

type Context = { params: Promise<{ essayId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const { essayId } = await context.params;
  const state = await buildPracticeState(user.id, essayId);
  if (!state) {
    return NextResponse.json({ error: "Không tìm thấy đề." }, { status: 404 });
  }
  return NextResponse.json(state);
}
