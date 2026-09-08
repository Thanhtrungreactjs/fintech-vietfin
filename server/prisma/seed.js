const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Real Vietnamese insurers and their actual (or clearly-labeled generic real
// product line) offerings. Base rates are order-of-magnitude approximations
// derived from publicly reported premium ranges — not the insurer's actual
// underwriting rate card — for demo purposes only.
function favicon(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

const plans = [
  {
    code: "BV-ANGIA",
    name: "Bảo Việt An Gia",
    insurer: "Bảo Việt",
    insurerLogo: favicon("www.baoviet.com.vn"),
    category: "HEALTH",
    baseRate: 1.8,
    description: "Gói bảo hiểm sức khoẻ toàn diện cho cá nhân và gia đình.",
    highlights: JSON.stringify([
      "Bảo lãnh viện phí trực tiếp tại hơn 200 bệnh viện",
      "Chi trả cả điều trị nội trú và ngoại trú",
      "Không yêu cầu khám sức khoẻ khi tham gia",
    ]),
    minSumInsured: 50_000_000,
    maxSumInsured: 2_000_000_000,
  },
  {
    code: "PVI-CARE",
    name: "PVI Care",
    insurer: "PVI",
    insurerLogo: favicon("www.pvi.com.vn"),
    category: "HEALTH",
    baseRate: 2.0,
    description: "Bảo hiểm sức khoẻ cao cấp với mạng lưới bảo lãnh viện phí rộng khắp.",
    highlights: JSON.stringify([
      "Bảo lãnh viện phí trực tiếp tại 150+ cơ sở y tế",
      "Khám ngoại trú không giới hạn số lần",
      "Áp dụng cho trẻ em từ 15 ngày tuổi",
    ]),
    minSumInsured: 100_000_000,
    maxSumInsured: 3_000_000_000,
  },
  {
    code: "MIC-CARE",
    name: "MIC Care",
    insurer: "MIC (Bảo hiểm Quân đội)",
    insurerLogo: favicon("baohiemmic.vn"),
    category: "HEALTH",
    baseRate: 1.5,
    description: "Bảo hiểm sức khoẻ không yêu cầu khám sức khoẻ trước khi tham gia.",
    highlights: JSON.stringify([
      "Quyền lợi tối đa 1 tỷ đồng/năm",
      "Không cần khám sức khoẻ trước khi mua",
      "Hỗ trợ chi trả sau thời gian chờ với bệnh có sẵn",
    ]),
    minSumInsured: 50_000_000,
    maxSumInsured: 1_000_000_000,
  },
  {
    code: "VBI-PREMIER",
    name: "VBI Premier Care",
    insurer: "VBI (Bảo hiểm VietinBank)",
    insurerLogo: favicon("myvbi.vn"),
    category: "HEALTH",
    baseRate: 3.0,
    description: "Gói sức khoẻ cao cấp với quyền lợi bảo lãnh viện phí toàn cầu.",
    highlights: JSON.stringify([
      "Quyền lợi cao cấp lên đến 60 tỷ đồng/năm",
      "Bảo lãnh viện phí toàn cầu",
      "Tiêu chuẩn phòng bệnh 1 giường",
    ]),
    minSumInsured: 200_000_000,
    maxSumInsured: 5_000_000_000,
  },
  {
    code: "PVI-OTOVATCHAT",
    name: "Bảo hiểm Vật chất Ô tô PVI",
    insurer: "PVI",
    insurerLogo: favicon("www.pvi.com.vn"),
    category: "VEHICLE",
    baseRate: 1.8,
    description: "Bảo hiểm thiệt hại vật chất xe ô tô, đi kèm hỗ trợ cứu hộ.",
    highlights: JSON.stringify([
      "Bồi thường thay thế mới cho xe dưới 6 tháng",
      "Cứu hộ 24/7 toàn quốc",
      "Không áp dụng khấu hao phụ tùng chính hãng",
    ]),
    minSumInsured: 200_000_000,
    maxSumInsured: 5_000_000_000,
  },
  {
    code: "BV-OTOVATCHAT",
    name: "Bảo hiểm Vật chất Ô tô Bảo Việt",
    insurer: "Bảo Việt",
    insurerLogo: favicon("www.baoviet.com.vn"),
    category: "VEHICLE",
    baseRate: 1.6,
    description: "Bảo hiểm vật chất ô tô với hệ thống gara sửa chữa chính hãng.",
    highlights: JSON.stringify([
      "Sửa chữa tại hệ thống gara chính hãng",
      "Có thể mua kèm bảo hiểm thuỷ kích",
      "Hỗ trợ pháp lý khi xảy ra tai nạn",
    ]),
    minSumInsured: 200_000_000,
    maxSumInsured: 4_000_000_000,
  },
  {
    code: "PTI-XEMAY",
    name: "Bảo hiểm Xe máy PTI",
    insurer: "PTI (Bảo hiểm Bưu điện)",
    insurerLogo: favicon("baohiempti.com.vn"),
    category: "VEHICLE",
    baseRate: 1.2,
    description: "Bảo hiểm thiệt hại vật chất và trách nhiệm dân sự cho xe máy.",
    highlights: JSON.stringify([
      "Bồi thường thiệt hại vật chất xe",
      "Kèm trách nhiệm dân sự bắt buộc",
      "Bồi thường tai nạn cho người ngồi trên xe",
    ]),
    minSumInsured: 10_000_000,
    maxSumInsured: 100_000_000,
  },
  {
    code: "PJICO-PHUGIA",
    name: "PJICO Phú Gia",
    insurer: "PJICO",
    insurerLogo: null,
    category: "HOME",
    baseRate: 0.08,
    description: "Bảo hiểm cháy nổ và thiệt hại nhà ở toàn diện, mở rộng cả rủi ro động đất.",
    highlights: JSON.stringify([
      "Đáp ứng quy định bảo hiểm cháy nổ bắt buộc",
      "Mở rộng bảo vệ trước rủi ro động đất",
      "Bồi thường cả tài sản, vật dụng trong nhà",
    ]),
    minSumInsured: 500_000_000,
    maxSumInsured: 10_000_000_000,
  },
  {
    code: "BM-CHAYNONHA",
    name: "Bảo hiểm Cháy nổ Nhà ở Bảo Minh",
    insurer: "Bảo Minh",
    insurerLogo: favicon("baominh.com.vn"),
    category: "HOME",
    baseRate: 0.06,
    description: "Bảo hiểm cháy, nổ, sét đánh cho nhà ở theo quy định nhà nước.",
    highlights: JSON.stringify([
      "Bồi thường thiệt hại do cháy, nổ, sét đánh",
      "Áp dụng cho cả nhà ở và tài sản bên trong",
      "Mức phí theo biểu phí quy định của nhà nước",
    ]),
    minSumInsured: 300_000_000,
    maxSumInsured: 8_000_000_000,
  },
  {
    code: "PVI-DULICHQT",
    name: "Bảo hiểm Du lịch Quốc tế PVI",
    insurer: "PVI",
    insurerLogo: favicon("www.pvi.com.vn"),
    category: "TRAVEL",
    baseRate: 3.5,
    description: "Bảo hiểm du lịch quốc tế, bảo vệ toàn diện cho chuyến đi nước ngoài.",
    highlights: JSON.stringify([
      "Chi trả y tế khẩn cấp khi ở nước ngoài",
      "Hỗ trợ huỷ chuyến, chậm chuyến bay",
      "Bồi thường thất lạc hành lý",
    ]),
    minSumInsured: 20_000_000,
    maxSumInsured: 2_000_000_000,
  },
  {
    code: "BV-VJTRAVELSAFE",
    name: "Vietjet Travel Safe",
    insurer: "Bảo Việt (đồng bảo hiểm cùng HD Insurance)",
    insurerLogo: favicon("www.baoviet.com.vn"),
    category: "TRAVEL",
    baseRate: 3.0,
    description: "Bảo hiểm du lịch phân phối chính thức qua Vietjet Air.",
    highlights: JSON.stringify([
      "Phân phối chính thức qua Vietjet Air",
      "Bảo vệ cho cả chuyến bay nội địa và quốc tế",
      "Thủ tục bồi thường trực tuyến nhanh chóng",
    ]),
    minSumInsured: 10_000_000,
    maxSumInsured: 1_000_000_000,
  },
  {
    code: "PRU-DAUTULINHHOAT",
    name: "PRU-Đầu Tư Linh Hoạt",
    insurer: "Prudential",
    insurerLogo: favicon("prudential.com.vn"),
    category: "LIFE",
    baseRate: 1.0,
    description: "Bảo hiểm nhân thọ liên kết đầu tư với danh mục quỹ linh hoạt.",
    highlights: JSON.stringify([
      "Sản phẩm bảo hiểm liên kết đầu tư",
      "6 quỹ đầu tư linh hoạt lựa chọn",
      "Độ tuổi tham gia từ 1 tháng đến 65 tuổi",
    ]),
    minSumInsured: 100_000_000,
    maxSumInsured: 10_000_000_000,
  },
  {
    code: "AIA-KHOETRONVEN",
    name: "AIA Khoẻ Trọn Vẹn",
    insurer: "AIA Việt Nam",
    insurerLogo: favicon("aia.com.vn"),
    category: "LIFE",
    baseRate: 1.2,
    description: "Bảo hiểm nhân thọ trọn đời, đóng phí ngắn hạn, bảo vệ dài hạn.",
    highlights: JSON.stringify([
      "Bảo hiểm nhân thọ trọn đời",
      "Đóng phí 5 năm, bảo vệ 30 năm",
      "Cộng thêm 20% số tiền bảo hiểm cho hội viên AIA Vitality",
    ]),
    minSumInsured: 200_000_000,
    maxSumInsured: 10_000_000_000,
  },
  {
    code: "DAIICHI-ANTAMSONGHANH",
    name: "An Tâm Song Hành",
    insurer: "Dai-ichi Life Việt Nam",
    insurerLogo: favicon("dai-ichi-life.com.vn"),
    category: "LIFE",
    baseRate: 1.1,
    description: "Bảo hiểm nhân thọ trọn đời linh hoạt kèm quyền lợi chăm sóc sức khoẻ toàn cầu.",
    highlights: JSON.stringify([
      "Bảo hiểm nhân thọ trọn đời linh hoạt",
      "Kèm quyền lợi chăm sóc sức khoẻ toàn cầu 24/7",
      "Chi trả tối đa 2 tỷ đồng/bệnh cho quyền lợi sức khoẻ",
    ]),
    minSumInsured: 200_000_000,
    maxSumInsured: 10_000_000_000,
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
  console.log(`Seeded ${plans.length} insurance plans from real insurers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
