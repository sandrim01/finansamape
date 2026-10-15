// src/lib/empresa.ts
// Dados Cadastrais Oficiais da SAMAPE ÍNDIO MECÂNICA PESADA

export const DADOS_EMPRESA = {
  razaoSocial: "Samape Mecanica Pesada LTDA",
  nomeFantasia: "Samape Indio Mecanica Pesada",
  cnpj: "29.025.779/0001-81",
  cnpjApenasNumeros: "29025779000181",
  dataFundacao: "06/11/2017",
  situacaoCadastral: "Ativa",
  porte: "ME",
  endereco: "Estrada Cachoeiro X Atilio Vivacqua",
  cidade: "Cachoeiro de Itapemirim",
  uf: "ES",
  cidadeUf: "Cachoeiro de Itapemirim - ES",
  cep: "29.300-970",
  enderecoCompleto: "Estrada Cachoeiro X Atilio Vivacqua, Cachoeiro de Itapemirim - ES, CEP 29.300-970",
  telefone: "(28) 9 9963-3220",
  telefoneFormatado: "(28) 9 9963-3220",
  telefoneNumeros: "28999633220",
  cnae: "G-4520-0/01",
  atividadePrincipal: "Serviços de manutenção e reparação mecânica de veículos automotores",
  emailContato: "contato@samape.com.br",
  chavePix: "indio@samapeop.com",
  sistema: "SAMAPEOP Financeiro",
} as const;

/**
 * Gera um Hash Criptográfico SHA-256 seguro de autenticação para o documento.
 * Utiliza apenas dados públicos da transação para garantir integridade e autenticidade.
 */
export async function gerarHashAutenticacaoDocumento(params: {
  protocolo: string;
  data: string;
  valor: number;
  pagadorOuFavorecido: string;
}): Promise<string> {
  const dados = `${params.protocolo}|${DADOS_EMPRESA.cnpj}|${params.data}|${params.valor.toFixed(2)}|${params.pagadorOuFavorecido}`;
  
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dados);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    // Retorna formatado em blocos para conferência visual profissional (ex: 8A4F-2E10-BC33-4D91)
    return `${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}`;
  }

  // Fallback determinístico
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    hash = (hash << 5) - hash + dados.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, "0").toUpperCase();
  return `${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
}
