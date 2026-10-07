import type { Metadata } from "next";
import { AuthScreen } from "@/components/AuthScreen";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
