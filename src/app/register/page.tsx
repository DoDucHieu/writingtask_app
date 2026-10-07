import type { Metadata } from "next";
import { AuthScreen } from "@/components/AuthScreen";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
