"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency } from "@/lib/utils";
import { Users, Search, Phone, Mail, MapPin, Wrench, FileText, DollarSign } from "lucide-react";

interface Cliente {
  id: number;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  total_maquinas: number;
  total_os: number;
  total_faturado: number;
  pendente_receber: number;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(busca)) ||
      (c.cpf && c.cpf.includes(busca)) ||
      (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalFaturadoGeral = clientes.reduce((acc, c) => acc + c.total_faturado, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Clientes & Faturamento por Conta"
        subtitle="Monitore o faturamento histórico e inadimplência de cada cliente da Samape"
        onRefresh={carregarClientes}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Clientes Cadastrados</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{clientes.length}</div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Empresas e pessoas físicas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Faturamento Consolidado</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(totalFaturadoGeral)}
              </div>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Soma de todas as contas atendidas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Média por Cliente</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                {formatCurrency(clientes.length > 0 ? totalFaturadoGeral / clientes.length : 0)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">LTV médio da carteira</p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nome, CNPJ ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Grid de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              Carregando clientes do banco de dados...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">Nenhum cliente encontrado.</div>
          ) : (
            clientesFiltrados.map((c) => (
              <div
                key={c.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{c.nome}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      ID #{c.id}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {c.cnpj ? `CNPJ: ${c.cnpj}` : c.cpf ? `CPF: ${c.cpf}` : "Documento não cadastrado"}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {c.telefone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {c.telefone}
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}
                      </p>
                    )}
                    {(c.cidade || c.estado) && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {[c.cidade, c.estado].filter(Boolean).join(" - ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Máquinas / OS</span>
                    <span className="font-bold text-slate-800">
                      {c.total_maquinas} maq. | {c.total_os} OS
                    </span>
                  </div>
                  <div className="bg-blue-50/70 p-2.5 rounded-lg text-right">
                    <span className="text-[11px] text-blue-700 block font-semibold">Total Faturado</span>
                    <span className="font-extrabold text-blue-900">{formatCurrency(c.total_faturado)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
