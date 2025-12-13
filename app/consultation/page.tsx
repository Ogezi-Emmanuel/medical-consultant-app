import { type Metadata } from "next";

import { ConsultationContent } from "./consultation-content";

export const metadata: Metadata = {
  title: "Consultation",
};

export default function ConsultationPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <ConsultationContent searchParams={searchParams} />;
}
