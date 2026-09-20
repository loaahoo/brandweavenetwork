import type { Metadata } from "next";
import { AuthStub } from "@/components/platform/auth-stub";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthStub mode="login" />;
}
