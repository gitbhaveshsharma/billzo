import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sign Up – StorePOS",
    description: "Create your StorePOS account",
};

export default function SignupPage() {
    return <SignupForm />;
}
