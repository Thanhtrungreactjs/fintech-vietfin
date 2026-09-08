const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const plans = [
  {
    code: "HEALTH-BASIC",
    name: "Bảo hiểm sức khoẻ cơ bản",
    category: "HEALTH",
    baseRate: 1.5,
    description: "Chi trả viện phí nội trú, ngoại trú cơ bản.",
  },
  {
    code: "HEALTH-PLUS",
    name: "Bảo hiểm sức khoẻ nâng cao",
    category: "HEALTH",
    baseRate: 2.8,
    description: "Mở rộng quyền lợi nha khoa, thai sản, bệnh hiểm nghèo.",
  },
  {
    code: "VEHICLE-CAR",
    name: "Bảo hiểm ô tô toàn diện",
    category: "VEHICLE",
    baseRate: 1.8,
    description: "Bảo hiểm vật chất xe và trách nhiệm dân sự.",
  },
  {
    code: "VEHICLE-MOTO",
    name: "Bảo hiểm xe máy",
    category: "VEHICLE",
    baseRate: 1.2,
    description: "Bảo hiểm tai nạn và trách nhiệm dân sự xe máy.",
  },
  {
    code: "HOME-BASIC",
    name: "Bảo hiểm nhà ở",
    category: "HOME",
    baseRate: 0.6,
    description: "Bảo vệ tài sản trước hoả hoạn, thiên tai, trộm cắp.",
  },
  {
    code: "TRAVEL-INTL",
    name: "Bảo hiểm du lịch quốc tế",
    category: "TRAVEL",
    baseRate: 3.5,
    description: "Chi trả y tế khẩn cấp, huỷ chuyến, thất lạc hành lý khi du lịch nước ngoài.",
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.insurancePlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${plans.length} insurance plans.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
