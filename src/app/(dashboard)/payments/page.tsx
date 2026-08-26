import { redirect } from "next/navigation";

export default function PaymentsLegacyRedirect() {
  redirect("/finance/payments");
}
