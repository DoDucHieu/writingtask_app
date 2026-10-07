import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDictionaryDirection, lookupWord } from "@/lib/dictionary";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const directionParam = request.nextUrl.searchParams.get("direction");
  const direction = isDictionaryDirection(directionParam) ? directionParam : "en-vi";

  if (!query || query.length > 100 || Buffer.byteLength(query, "utf8") > 450) {
    return NextResponse.json(
      { error: "Hãy nhập từ hoặc cụm từ không quá 100 ký tự." },
      { status: 400 },
    );
  }

  try {
    const result = await lookupWord(query, direction);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Dịch vụ từ điển đang bận. Hãy thử lại sau." },
      { status: 503 },
    );
  }
}
