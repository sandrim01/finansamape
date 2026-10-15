export interface CentroCustoDef {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  cor: string;
  corBg: string;
  corBorder: string;
  corTexto: string;
  categorias: string[];
}

export const CENTROS_DE_CUSTO: CentroCustoDef[] = [
  {
    id: "OFICINA",
    codigo: "CC-01",
    nome: "Operação & Oficina",
    descricao: "Custos diretos da oficina mecânica, insumos técnicos e peças",
    cor: "#3B82F6",
    corBg: "bg-blue-500/10",
    corBorder: "border-blue-500/30",
    corTexto: "text-blue-400",
    categorias: [
      "Peças & Fornecedores",
      "Ferramentas & Equipamentos",
      "Insumos, Óleos & Consumíveis",
      "Manutenção de Equipamentos da Oficina",
    ],
  },
  {
    id: "CAMPO",
    codigo: "CC-02",
    nome: "Socorro em Campo & Frota",
    descricao: "Veículos de atendimento externo, combustível nas mineradoras e pedágios",
    cor: "#F59E0B",
    corBg: "bg-amber-500/10",
    corBorder: "border-amber-500/30",
    corTexto: "text-amber-400",
    categorias: [
      "Combustível & Lubrificantes (Frota)",
      "Manutenção & Revisão dos Veículos",
      "Pedágios, Alimentação & Estadias",
      "Seguro & IPVA dos Veículos de Socorro",
    ],
  },
  {
    id: "PESSOAL",
    codigo: "CC-03",
    nome: "Pessoal & Especialistas Técnicos",
    descricao: "Mão de obra, salários dos mecânicos, pró-labore e EPIs",
    cor: "#10B981",
    corBg: "bg-emerald-500/10",
    corBorder: "border-emerald-500/30",
    corTexto: "text-emerald-400",
    categorias: [
      "Folha de Pagamento & Salários Mecânicos",
      "Pró-Labore Sócios / Diretoria",
      "EPIs & Fardamento de Proteção",
      "Comissões & Bonificações Operacionais",
    ],
  },
  {
    id: "ADMINISTRATIVO",
    codigo: "CC-04",
    nome: "Administrativo & Infraestrutura",
    descricao: "Estrutura do galpão, aluguel, energia, sistemas e contabilidade",
    cor: "#8B5CF6",
    corBg: "bg-purple-500/10",
    corBorder: "border-purple-500/30",
    corTexto: "text-purple-400",
    categorias: [
      "Aluguel & IPTU do Galpão",
      "Energia Elétrica, Água & Telefonia",
      "Software, Sistemas & Internet",
      "Assessoria Contábil & Jurídica",
      "Material de Escritório & Limpeza",
    ],
  },
  {
    id: "TRIBUTARIO",
    codigo: "CC-05",
    nome: "Tributário & Financeiro",
    descricao: "Obrigações fiscais, DAS Simples Nacional, taxas e juros bancários",
    cor: "#EF4444",
    corBg: "bg-rose-500/10",
    corBorder: "border-rose-500/30",
    corTexto: "text-rose-400",
    categorias: [
      "Impostos & Tributos (DAS Simples/ISS)",
      "Tarifas Bancárias, Boletos & PIX",
      "Juros, Encargos & Empréstimos",
    ],
  },
];

/**
 * Mapeia ou extrai o Centro de Custo e a Subcategoria a partir do campo categoria salvo no banco.
 */
export function parseCentroCustoECategoria(rawCategoria: string | null | undefined): {
  centroCustoId: string;
  centroCustoCodigo: string;
  centroCustoNome: string;
  categoriaNome: string;
  cor: string;
  corBg: string;
  corTexto: string;
} {
  const cat = (rawCategoria || "").trim();

  // Verifica se já está no formato "CENTRO - CATEGORIA" ou "CENTRO: CATEGORIA"
  for (const cc of CENTROS_DE_CUSTO) {
    if (
      cat.startsWith(cc.id + " - ") ||
      cat.startsWith(cc.codigo + " - ") ||
      cat.startsWith(cc.nome + " - ") ||
      cat.startsWith(cc.id + ": ") ||
      cat.startsWith(cc.nome + ": ")
    ) {
      const parts = cat.split(/ - |: /);
      const subcategoria = parts.slice(1).join(" - ").trim();
      return {
        centroCustoId: cc.id,
        centroCustoCodigo: cc.codigo,
        centroCustoNome: cc.nome,
        categoriaNome: subcategoria || cc.nome,
        cor: cc.cor,
        corBg: cc.corBg,
        corTexto: cc.corTexto,
      };
    }
  }

  // Mapeamento semântico por palavras-chave
  const lower = cat.toLowerCase();

  if (
    lower.includes("peça") ||
    lower.includes("ferramenta") ||
    lower.includes("insumo") ||
    lower.includes("oficina") ||
    lower.includes("fornecedor")
  ) {
    const cc = CENTROS_DE_CUSTO[0]; // OFICINA
    return {
      centroCustoId: cc.id,
      centroCustoCodigo: cc.codigo,
      centroCustoNome: cc.nome,
      categoriaNome: cat || "Peças & Fornecedores",
      cor: cc.cor,
      corBg: cc.corBg,
      corTexto: cc.corTexto,
    };
  }

  if (
    lower.includes("combust") ||
    lower.includes("frota") ||
    lower.includes("deslocamento") ||
    lower.includes("pedágio") ||
    lower.includes("km") ||
    lower.includes("veículo")
  ) {
    const cc = CENTROS_DE_CUSTO[1]; // CAMPO
    return {
      centroCustoId: cc.id,
      centroCustoCodigo: cc.codigo,
      centroCustoNome: cc.nome,
      categoriaNome: cat || "Combustível & Frota",
      cor: cc.cor,
      corBg: cc.corBg,
      corTexto: cc.corTexto,
    };
  }

  if (
    lower.includes("folha") ||
    lower.includes("salário") ||
    lower.includes("pró-labore") ||
    lower.includes("pro-labore") ||
    lower.includes("epi") ||
    lower.includes("comiss")
  ) {
    const cc = CENTROS_DE_CUSTO[2]; // PESSOAL
    return {
      centroCustoId: cc.id,
      centroCustoCodigo: cc.codigo,
      centroCustoNome: cc.nome,
      categoriaNome: cat || "Folha de Pagamento & Pessoal",
      cor: cc.cor,
      corBg: cc.corBg,
      corTexto: cc.corTexto,
    };
  }

  if (
    lower.includes("imposto") ||
    lower.includes("tribut") ||
    lower.includes("das") ||
    lower.includes("simples") ||
    lower.includes("tarifa") ||
    lower.includes("juros") ||
    lower.includes("banco")
  ) {
    const cc = CENTROS_DE_CUSTO[4]; // TRIBUTARIO
    return {
      centroCustoId: cc.id,
      centroCustoCodigo: cc.codigo,
      centroCustoNome: cc.nome,
      categoriaNome: cat || "Impostos & Tributos",
      cor: cc.cor,
      corBg: cc.corBg,
      corTexto: cc.corTexto,
    };
  }

  // Padrão: ADMINISTRATIVO
  const ccAdmin = CENTROS_DE_CUSTO[3];
  return {
    centroCustoId: ccAdmin.id,
    centroCustoCodigo: ccAdmin.codigo,
    centroCustoNome: ccAdmin.nome,
    categoriaNome: cat || "Administrativo & Infraestrutura",
    cor: ccAdmin.cor,
    corBg: ccAdmin.corBg,
    corTexto: ccAdmin.corTexto,
  };
}

export function formatarCategoriaParaSalvar(
  centroCustoId: string,
  subcategoria: string
): string {
  const cc = CENTROS_DE_CUSTO.find((c) => c.id === centroCustoId);
  const prefixo = cc ? cc.id : "ADMINISTRATIVO";
  return `${prefixo} - ${subcategoria}`;
}
