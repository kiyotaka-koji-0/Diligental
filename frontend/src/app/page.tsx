"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/channels");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Diligental</h1>
          <p className="text-gray-500">Your self-hosted workplace chat.</p>
        </div>

        <div className="space-y-4">
          <Link href="/login" className="block w-full">
            <Button className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-700 text-white">
              Login
            </Button>
          </Link>

          <Link href="/register" className="block w-full">
            <Button variant="outline" className="w-full text-lg h-12 border-indigo-600 text-indigo-600 hover:bg-indigo-50">
              Create Account
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-400">
          <p>Secure. Private. Yours.</p>
        </div>
      </div>
    </div>
  );
}
