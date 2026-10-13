# FinanSamape - Web App de Gestão Financeira & OS

Sistema web corporativo desenvolvido para a **Samape**, integrado diretamente ao banco de dados PostgreSQL da operação de manutenção de máquinas (hospedado na Railway).

O objetivo do **FinanSamape** é rodar em paralelo ao web service operacional, transformando os dados de campo (ordens de serviço, clientes, mecânicos e peças) em inteligência financeira estratégica, controle de faturamento, contas a pagar/receber e DRE.

---

## 🚀 Funcionalidades Principais

### 1. 📊 Dashboard Executivo & KPIs
- **Faturamento Realizado:** Indicador em tempo real de todas as manutenções concluídas.
- **Previsão de Receita:** Volume financeiro das OS atualmente abertas na oficina.
- **Ticket Médio:** Valor médio faturado por ordem de serviço.
- **Composição da Receita:** Gráfico de distribuição entre Mão de Obra, Peças/Insumos e Deslocamento por KM.
- **Evolução Mensal:** Gráfico interativo com a progressão mês a mês do faturamento da empresa.
- **Rankings:** Clientes mais rentáveis e faturamento gerado por mecânico/técnico.

### 2. 🧾 Faturamento de Ordens de Serviço (Integração Operacional)
- Listagem de todas as OS geradas pelo web service de manutenção.
- Identificação instantânea de OS que já foram faturadas vs. prontas para cobrança.
- **Botão de Faturamento com 1 Clique:** Cria automaticamente um registro correspondente na tabela `contas_receber` vinculando cliente, valor total da OS e data de vencimento.

### 3. 📥 Contas a Receber
- Gestão completa das faturas pendentes, no prazo, liquidadas e vencidas.
- Lançamentos vinculados a Ordens de Serviço ou avulsos (vendas de balcão).
- Baixa rápida de recebimento com confirmação de pagamento.

### 4. 📤 Contas a Pagar
- Controle rigoroso de despesas operacionais da empresa.
- Categorias personalizadas: *Peças & Fornecedores, Combustível, Folha de Pagamento, Ferramentas, Aluguel, Impostos, etc.*
- Controle de vencimento para evitar atrasos e juros.

### 5. 📈 Fluxo de Caixa & DRE Gerencial
- Demonstrativo do Resultado do Exercício com cálculo automático de:
  - `(+)` Receita Bruta Operacional (Mão de Obra + Peças + Deslocamento)
  - `(-)` Custos Diretos / CPV
  - `(=)` Lucro Bruto Operacional
  - `(-)` Despesas Administrativas e Operacionais
  - `(=)` Lucro Líquido Realizado & Margem Líquida (%)

### 6. 👥 Clientes & Histórico Financeiro
- Monitoramento da carteira de 22+ empresas atendidas.
- Quantidade de máquinas ativas por cliente, total de OS abertas e faturamento histórico acumulado.

### 7. 📦 Estoque & Margens de Peças
- Visão financeira do almoxarifado de peças.
- Comparativo entre Preço de Custo e Preço de Venda.
- Margem unitária e capital total investido em estoque.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **ORM / Banco de Dados:** [Prisma ORM](https://www.prisma.io/) conectado diretamente ao **PostgreSQL** da Railway
- **Gráficos:** [Recharts](https://recharts.org/)
- **Ícones:** [Lucide Icons](https://lucide.dev/)

---

## 📦 Como Rodar o Projeto Localmente

### 1. Clonar o Repositório
```bash
git clone https://github.com/sandrim01/finansamape.git
cd finansamape
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (ou copie do `.env.example`):
```env
DATABASE_URL="postgresql://postgres:kbrfMrFmPcFTAFpoZGxNHYbHWiWOaSUQ@shinkansen.proxy.rlwy.net:47179/railway?sslmode=disable&connect_timeout=30"
JWT_SECRET="finansamape_secret_key_super_segura_2026"
```

### 4. Sincronizar o Banco e Iniciar o Servidor
```bash
# Gerar cliente do Prisma
npx prisma generate

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em seu navegador: [http://localhost:3000](http://localhost:3000)

---

## 🚢 Como Fazer Deploy

O projeto está pronto para deploy em qualquer plataforma moderna:
- **Vercel:** Importe o repositório `sandrim01/finansamape`, adicione a variável `DATABASE_URL` e faça o deploy automático.
- **Railway:** Adicione um serviço a partir do repositório GitHub e configure a variável `DATABASE_URL`.
