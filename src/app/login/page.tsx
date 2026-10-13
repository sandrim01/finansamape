"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lembrarEmail, setLembrarEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    // Carrega e-mail salvo se houver
    const savedEmail = localStorage.getItem("samape_saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha) {
      setErro("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao realizar login. Verifique suas credenciais.");
        setLoading(false);
        return;
      }

      // Salva ou remove e-mail lembrado
      if (lembrarEmail) {
        localStorage.setItem("samape_saved_email", email.trim());
      } else {
        localStorage.removeItem("samape_saved_email");
      }

      setSucesso(true);

      // Redireciona para o painel financeiro principal
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setErro("Falha de conexão com o servidor. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1329] flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-black/40 border border-white/20">
            <img
              src="/logo.png"
              alt="Logo Samape Índio"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-white flex items-center gap-1">
              SAMAPE <span className="text-rose-500 font-extrabold">ÍNDIO</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] font-semibold tracking-wider uppercase">
              FinanSamape • Módulo Financeiro
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151E34] border border-[#1E2C48] text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Ambiente Seguro • Railway DB</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto py-8 z-10">
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#0B1329] border border-[#1E2C48] mb-3 shadow-inner">
              <div className="h-12 w-12 rounded-xl bg-white p-1.5 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Samape"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Acesso ao Sistema Financeiro
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Entre com seu usuário e senha cadastrados no sistema SAMAPEOP
            </p>
          </div>

          {/* Feedback Alerts */}
          {erro && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{erro}</div>
            </div>
          )}

          {sucesso && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Autenticação autorizada! Redirecionando...</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@samapeop.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0B1329] border border-[#1E2C48] rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha de acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0B1329] border border-[#1E2C48] rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lembrarEmail}
                  onChange={(e) => setLembrarEmail(e.target.checked)}
                  className="rounded border-[#1E2C48] bg-[#0B1329] text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Lembrar meu e-mail</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Acesso por perfil
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || sucesso}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Helper note */}
          <div className="mt-6 pt-4 border-t border-[#1E2C48]/80 text-center">
            <p className="text-[11px] text-slate-400">
              Autenticação unificada com o banco de dados oficial da{" "}
              <strong className="text-slate-300">SAMAPE ÍNDIO</strong>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 z-10 border-t border-[#1E2C48]/50">
        <div>
          © {new Date().getFullYear()} SAMAPE ÍNDIO Manutenção • Todos os direitos reservados
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Banco Railway Online
          </span>
          <span>•</span>
          <span>FinanSamape v1.2</span>
        </div>
      </footer>
    </div>
  );
}
