import type { Locale } from "@/lib/locales";

/** Ein Text, der für jede unterstützte Sprache vorliegt. */
export type LocalizedText = Record<Locale, string>;

/**
 * Static subject metadata (name, code, semester, description). The actual
 * learning material lives in the `Document` table and is loaded per subject.
 */
export type Subject = {
  id: string;
  name: LocalizedText;
  code: string;
  semester: LocalizedText;
  summary: LocalizedText;
};

export const subjects: Subject[] = [
  {
    id: "bwl-einfuehrung",
    name: {
      de: "BWL Einführung",
      vi: "Nhập môn Quản trị Kinh doanh",
    },
    code: "BWL 101",
    semester: {
      de: "HS 2026",
      vi: "HK Thu 2026",
    },
    summary: {
      de: "Grundlagen der Betriebswirtschaftslehre: Ziele, Rechtsformen, Organisation und Marketing-Mix.",
      vi: "Kiến thức cơ bản về quản trị kinh doanh: mục tiêu, hình thức pháp lý, tổ chức và marketing-mix.",
    },
  },
  {
    id: "medizinische-grundbegriffe",
    name: {
      de: "Medizinische Grundbegriffe",
      vi: "Thuật ngữ Y khoa cơ bản",
    },
    code: "MED 110",
    semester: {
      de: "HS 2026",
      vi: "HK Thu 2026",
    },
    summary: {
      de: "Medizinische Fachsprache, Anatomie-Grundlagen und klinische Basiskonzepte verstehen.",
      vi: "Hiểu ngôn ngữ chuyên ngành y khoa, kiến thức giải phẫu cơ bản và các khái niệm lâm sàng nền tảng.",
    },
  },
  {
    id: "bilanzen",
    name: {
      de: "Bilanzen",
      vi: "Bảng cân đối kế toán",
    },
    code: "REW 210",
    semester: {
      de: "HS 2026",
      vi: "HK Thu 2026",
    },
    summary: {
      de: "Bilanzaufbau, Bilanzgleichung und Jahresabschluss nach HGB Schritt für Schritt erklärt.",
      vi: "Giải thích từng bước cấu trúc bảng cân đối, phương trình cân đối và báo cáo tài chính theo HGB.",
    },
  },
  {
    id: "deutsches-gesundheitssystem",
    name: {
      de: "Deutsches Gesundheitssystem",
      vi: "Hệ thống Y tế Đức",
    },
    code: "GES 120",
    semester: {
      de: "HS 2026",
      vi: "HK Thu 2026",
    },
    summary: {
      de: "GKV, PKV, Pflegeversicherung und die wichtigsten Akteure des deutschen Gesundheitswesens.",
      vi: "Bảo hiểm y tế công (GKV), bảo hiểm tư (PKV), bảo hiểm điều dưỡng và các chủ thể chính của hệ thống y tế Đức.",
    },
  },
];

export function getSubject(id: string): Subject | undefined {
  return subjects.find((subject) => subject.id === id);
}
