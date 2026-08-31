const areaNamesByGovernorate = [
  {
    name: "Capital Governorate",
    areas: [
      "Seef", "Adliya", "Al Burhama", "Al Hoora", "Manama", "Al Zinj",
      "Bahrain Bay", "Block 338", "Bu Ghazal", "Bu Quwah", "Diplomatic Area",
      "Gudaibiya", "Juffair", "Horat A'ali", "Jid Hafs", "Jidali", "Mahooz",
      "Manama Centre", "Nabih Saleh", "Qadam", "Ras Rumman", "Sanabis", "Tubli",
      "Umm Al Hassam", "Zinj", "Salmaniya", "Jurdab", "Karrana", "Karbabad",
    ],
  },
  {
    name: "Muharraq Governorate",
    areas: [
      "Muharraq", "Arad", "Busaiteen", "Galali", "Hidd", "Hidd Industrial",
      "Samaheej", "Diyar Al Muharraq", "Amwaj Islands", "Hajar",
      "Hajar Al Mushtarakat", "Hajar Al Mutubi", "Hilat Abdul Saleh",
    ],
  },
  {
    name: "Northern Governorate",
    areas: [
      "Saar", "Budaiya", "Barbar", "Janabiya", "Jasra", "Al Lawzi", "Al Jasra",
      "Al Jawhara", "Al Qadam", "Al Qaryah", "Al Qurayyah", "Bani Jamra",
      "Barr Al Jissah", "Diraz", "Dumistan", "Janussan", "Karranah", "Malikiya",
      "Maqsha", "Markhiya", "Qalali", "Sadad", "Sehla", "Shakhoura", "Zayed Town",
      "Hamad Town", "Abu Saiba", "Khamis", "Markh",
    ],
  },
  {
    name: "Southern Governorate",
    areas: [
      "Riffa", "Isa Town", "Aali", "Zallaq", "Askar", "Awali", "Jaww", "Karzakkan",
      "Sanad", "Al Duraz", "Al Bukowaira", "Jazzar Beach", "East Riffa", "West Riffa",
      "Sitra", "Sitra Al Hamriya", "Sitra Manba", "Sitra Muhaza", "Sitra Qadeem",
      "Sitra Um Al Baidh", "Nuwaidrat", "Ma'ameer", "Dar Kulaib", "Hawar Islands",
    ],
  },
];

const toSlug = (name) => name
  .toLowerCase()
  .replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

export const areaGroups = areaNamesByGovernorate.map((governorate) => ({
  name: governorate.name,
  areas: governorate.areas.map((name) => ({
    name,
    slug: `${toSlug(name)}-cleaning-services`,
    governorate: governorate.name,
  })),
}));

export const allAreas = areaGroups.flatMap((governorate) => governorate.areas);

export const getAreaBySlug = (slug) => allAreas.find((area) => area.slug === slug);

