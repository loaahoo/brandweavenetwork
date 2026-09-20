import type { Metadata } from "next";
import { AuthStub } from "@/components/platform/auth-stub";

export const metadata: Metadata = { title: "Join the Network" };

export default function SignupPage() {
  return <AuthStub mode="signup" />;
}
