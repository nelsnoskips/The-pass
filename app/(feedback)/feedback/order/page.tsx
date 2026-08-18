import type { Metadata } from "next";
import { Register } from "@/components/feedback/Register";

export const metadata: Metadata = {
  title: "Order pickup — FEEDBACK",
  description: "Order smash burgers, fries and shakes for pickup at 1624 Pressure Ave.",
};

export default function OrderPage() {
  return <Register />;
}
