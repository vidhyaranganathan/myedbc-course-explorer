export interface Course {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  subCategory: string | null;
  gradProgram: string | null;
  gradRequirement: string | null;
}
