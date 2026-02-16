import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Login – StorePOS",
    description: "Sign in to your StorePOS account",
};

export default function LoginPage() {
    return <LoginForm />;
}
