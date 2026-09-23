import { createFileRoute } from "@tanstack/react-router";
import { PublicBookingWizard } from "./$companySlug.index";

export const Route = createFileRoute("/$companySlug/online-booking")({
  head: () => ({
    meta: [
      { title: "Online Appointment Booking — QUESOLS" },
      { name: "description", content: "Schedule an online queue appointment or booking." },
      { property: "og:title", content: "Online Appointment Booking" },
    ],
  }),
  component: PublicBookingWizard,
});
