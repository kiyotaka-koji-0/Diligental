"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { CustomNotification } from "@/components/ui/custom-notification";

export default function LandingPage() {
  const router = useRouter();

  const [showNotification, setShowNotification] = useState(false);

 

  return (
    <div className="min-h-screen flex flex-col relative text-white selection:bg-red-500/30">
      <CustomNotification
        type="info"
        title="Welcome to Diligental"
        message="Experience the future of workplace communication."
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b-0 border-[#27272a]/40 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            Diligental
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-gray-200 border-0 shadow-lg shadow-white/10">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center pt-32 pb-20 px-6 relative z-10">

        {/* Trusted Badge */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-red-500/20 bg-red-500/5 text-red-200 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Trusted by 10,000+ Teams
          </div>
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-center tracking-tight mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
          The <span className="text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Ultimate</span> Workplace <br className="hidden md:block" /> Chat Experience
        </h1>

        <p className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mb-10 leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
          Elevate your team's communication with Diligental. Advanced security, real-time messaging, and seamless collaboration implementation.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.4s" }}>
          <Link href="/register">
            <Button size="lg" className="h-14 px-8 text-base shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all duration-300">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="h-14 px-8 text-base bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm">
              View Features
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 w-full max-w-6xl animate-fade-in-up opacity-0" style={{ animationDelay: "0.6s" }}>
          <StatCard icon={<Users className="w-6 h-6 text-red-500" />} label="Active Users" value="100K+" />
          <StatCard icon={<MessageSquare className="w-6 h-6 text-red-500" />} label="Messages Sent" value="50M+" />
          <StatCard icon={<Zap className="w-6 h-6 text-red-500" />} label="Uptime" value="99.9%" />
          <StatCard icon={<TrendingUp className="w-6 h-6 text-red-500" />} label="User Rating" value="4.9/5" />
        </div>

      </main>

      {/* Footer Glow */}
      <div className="fixed bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-red-900/20 to-transparent pointer-events-none z-0" />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/30 hover:bg-white/10 transition-all duration-300 group">
      <div className="p-3 rounded-xl bg-red-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400 font-medium">{label}</div>
    </div>
  )
}
