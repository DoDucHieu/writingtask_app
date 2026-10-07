import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { essays } from "./essays";

const prisma = new PrismaClient();
const DEMO_EMAIL = "demo@writing.local";
const DEMO_PASSWORD = "demo1234";
const INITIAL_CREDITS = 20;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Học viên demo",
      passwordHash,
      credits: INITIAL_CREDITS,
    },
  });

  for (const essay of essays) {
    const existing = await prisma.essay.findUnique({ where: { slug: essay.slug } });
    if (existing) continue;

    await prisma.essay.create({
      data: {
        slug: essay.slug,
        title: essay.title,
        prompt: essay.prompt,
        topic: essay.topic,
        difficulty: essay.difficulty,
        position: essay.position,
        sentences: {
          create: essay.sentences.map((sentence) => ({
            order: sentence.order,
            vietnameseHint: sentence.vietnameseHint,
            referenceEnglish: sentence.referenceEnglish,
            keywords: JSON.stringify(sentence.keywords),
            structureTip: sentence.structureTip,
          })),
        },
      },
    });
  }

  console.log("Đã tạo tài khoản demo và ngân hàng đề.");
  console.log(`Đăng nhập: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
