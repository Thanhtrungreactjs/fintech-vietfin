// Category-specific fields captured for the insured subject, replacing a
// single free-text field with structured data appropriate to each product
// type — and letting policy detail render a labeled summary instead of a
// raw JSON dump.
export const CATEGORY_FIELDS = {
  HEALTH: [
    { key: "fullName", label: "Họ tên người được bảo hiểm", required: true },
    { key: "dob", label: "Ngày sinh", type: "date", required: true },
    { key: "idNumber", label: "Số CCCD/CMND", required: true },
    { key: "preExistingCondition", label: "Bệnh nền / tiền sử bệnh (nếu có)", required: false },
  ],
  VEHICLE: [
    { key: "plateNumber", label: "Biển số xe", required: true, placeholder: "VD: 59A-123.45" },
    { key: "vehicleBrand", label: "Hãng xe", required: true, placeholder: "VD: Honda, Toyota" },
    { key: "vehicleModel", label: "Dòng xe", required: true, placeholder: "VD: Vision, Vios" },
    { key: "manufactureYear", label: "Năm sản xuất", type: "number", required: true },
  ],
  HOME: [
    { key: "propertyAddress", label: "Địa chỉ tài sản", required: true },
    {
      key: "propertyType",
      label: "Loại hình nhà ở",
      type: "select",
      options: ["Nhà phố", "Chung cư", "Biệt thự", "Nhà cấp 4"],
      required: true,
    },
    { key: "areaM2", label: "Diện tích (m²)", type: "number", required: true },
  ],
  TRAVEL: [
    { key: "destination", label: "Điểm đến", required: true, placeholder: "VD: Thái Lan, Nhật Bản" },
    { key: "departureDate", label: "Ngày khởi hành", type: "date", required: true },
    { key: "returnDate", label: "Ngày về", type: "date", required: true },
    { key: "travelers", label: "Số người tham gia", type: "number", required: true },
  ],
  LIFE: [
    { key: "fullName", label: "Họ tên người được bảo hiểm", required: true },
    { key: "dob", label: "Ngày sinh", type: "date", required: true },
    { key: "idNumber", label: "Số CCCD/CMND", required: true },
    { key: "beneficiary", label: "Người thụ hưởng", required: true },
  ],
};

export function emptySubjectInfo(category) {
  const fields = CATEGORY_FIELDS[category] || [];
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}
