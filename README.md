# 🏥 PSF Digital - Sistema de Gestão de Saúde da Família

O **PSF Digital** é uma plataforma web integrada de alta performance voltada para a gestão de postos de saúde municipais (Unidades Básicas de Saúde - UBS / Programas de Saúde da Família - PSF). O sistema foi arquitetado para simplificar e digitalizar toda a esteira de atendimento à saúde pública, desde o acolhimento e agendamento até o atendimento médico com prontuário eletrônico, controle farmacêutico e relatórios gerenciais, com total rastreabilidade em conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 🚀 Tecnologias Utilizadas

A plataforma adota uma stack moderna que garante flexibilidade, escalabilidade e excelente experiência de desenvolvimento:

*   **Framework Core:** [Next.js 16 (App Router)](https://nextjs.org/) utilizando a engine do **Turbopack** para compilação ultra-rápida.
*   **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/) para layouts responsivos, fluidos e design premium em modo escuro (Dark Mode).
*   **Banco de Dados & ORM:** [PostgreSQL](https://www.postgresql.org/) como banco relacional, orquestrado através do [Prisma ORM](https://www.prisma.io/).
*   **Contêineres:** [Docker](https://www.docker.com/) e **Docker Compose** para isolamento do banco de dados e serviços auxiliares (Nginx, Redis).
*   **Segurança:** Autenticação baseada em [JSON Web Tokens (JWT)](https://jwt.io/) com senhas criptografadas via **Bcrypt**.
*   **Auxiliares:** `lucide-react` para ícones modernos, `zod` e `react-hook-form` para validação robusta de formulários, `recharts` para gráficos de indicadores, além de utilitários como `jspdf` (geração de receitas em PDF) e `xlsx` (exportação de relatórios).

---

## 🏗️ Arquitetura Multi-Tenant (Multimunicípio)

O banco de dados do PSF Digital foi estruturado para suportar **Multi-Tenancy nativo**. O modelo centralizador é o `Municipality`. 

Todas as entidades essenciais do sistema — de usuários e médicos a pacientes, medicamentos e logs de auditoria — estão diretamente associadas a um ID de município (`municipalityId`). Isso viabiliza:
1.  **Isolamento de Dados:** Cada município acessa apenas seus respectivos prontuários, agendas e estoque.
2.  **Identidade Visual Dinâmica:** Cada município possui seu próprio logotipo e paleta de cores primária e secundária (`primaryColor` e `secondaryColor`), aplicados em tempo de execução no frontend.
3.  **Configurações Customizadas:** Parâmetros específicos (como permitir encaixes de consultas e habilitação de envio de SMS/WhatsApp) são controlados individualmente pela tabela `Setting`.

---

## 🔑 Controle de Acesso Granular (RBAC)

O sistema conta com um modelo robusto de controle de acesso baseado em papéis (*Role-Based Access Control* - RBAC):

*   **Tabela `Role` e `Permission`:** Permissões detalhadas como `users:create`, `appointments:cancel`, `medical_records:create`, `stock:write` e `audit:read` são associadas a cargos.
*   **Cargos Principais:**
    *   **Administrador Geral:** Acesso irrestrito a configurações, auditorias e gestão de usuários.
    *   **Médico:** Permissões clínicas (leitura/escrita de prontuários, receitas médicas, solicitações de exames).
    *   **Recepcionista:** Gestão de cadastros de pacientes e agendamentos/cancelamentos de consultas.
    *   **Farmácia:** Controle de estoque, movimentações (entradas/perdas) e dispensação de receitas.
    *   **Gestor Municipal (Secretário de Saúde):** Visualização de relatórios gerenciais, dashboards e estatísticas de uso.

---

## 📸 Módulos e Telas do Sistema

### 1. Portal de Acesso (Login)
Uma interface limpa e intuitiva baseada em credenciais corporativas. O operador insere o identificador (Slug) do município correspondente para carregar a configuração e banco corretos daquela localidade.

![Portal de Acesso](./public/screenshots/login.png)

*   **Identificador do Município:** Resolve o tenant adequado no banco de dados.
*   **Conformidade:** Lembrete explícito de proteção de dados (LGPD) no rodapé.

---

### 2. Painel de Controle (Dashboard Geral)
Visão consolidada da operação de saúde do município. Oferece gráficos dinâmicos de atendimento diário, contadores em tempo real para equipes ativas, alertas de estoque e o fluxo de consultas agendadas.

![Dashboard Geral](./public/screenshots/dashboard.png)

*   **Indicadores Rápidos:** Total de pacientes, consultas marcadas no dia, profissionais em atendimento e alertas críticos de farmácia.
*   **Gráficos Interativos:** Evolução de agendamentos diários e ocupação de salas de atendimento.

---

### 3. Cadastro e Prontuário de Pacientes
Central de gestão dos pacientes atendidos pelo posto. Permite a busca rápida por CPF, Nome ou número do Cartão Nacional de Saúde (CNS/SUS), exibindo tags rápidas com dados cruciais (Ex: Alergias, Hipertensão, Diabetes).

![Gestão de Pacientes](./public/screenshots/pacientes.png)

*   **Histórico Consolidado:** Linha do tempo integrada exibindo consultas anteriores, receitas ativas e exames solicitados.
*   **Ficha Clínica Rápida:** Visualização direta de alergias severas e doenças crônicas no card lateral.

---

### 4. Painel de Agendamento (Agenda)
Controle de horários e especialidades. A recepção pode alocar pacientes para médicos de diferentes especialidades (Clínico Geral, Pediatria, Ginecologia, etc.), respeitando a duração parametrizada da consulta e bloqueios na agenda médica.

![Agendamento de Consultas](./public/screenshots/agendar.png)

*   **Verificação de Slots:** Detecção automatizada de conflitos de horários e períodos de intervalo (almoço/descanso).
*   **Lista de Espera:** Suporte a posicionamento em lista de espera caso a agenda do médico selecionado esteja lotada.

---

### 5. Atendimento Médico e Prontuário Eletrônico (EHR)
A tela de trabalho principal dos médicos. Exibe o painel de sinais vitais atuais (Pressão Arterial, Peso, Saturação de O2, Frequência Cardíaca, Temperatura), espaço para anotações de anamnese, campo inteligente de CID-10 e emissão digital de prescrições e exames.

![Atendimento Clínico](./public/screenshots/atendimento.png)

*   **Integração com Farmácia:** Ao digitar a prescrição, o sistema sugere medicamentos com base no estoque disponível em tempo real na farmácia interna do posto.
*   **Assinatura Digital:** Mecanismo para atestar a autenticidade da receita emitida.

---

### 6. Farmácia e Gestão de Estoque
Módulo para farmácias comunitárias municipais. Controla as entradas, dispensações vinculadas a prescrições médicas, perdas e vencimento de lotes de remédios como Amoxicilina, Paracetamol, etc.

![Estoque de Medicamentos](./public/screenshots/farmacia.png)

*   **Alerta de Ruptura de Estoque:** Avisos visuais em vermelho para medicamentos abaixo do nível mínimo de segurança.
*   **Rastreabilidade de Lotes:** Controle preciso sobre a data de expiração para priorizar lotes mais antigos.

---

### 7. Configurações Administrativas
Módulo exclusivo do Administrador e Gestores para alteração de parâmetros do sistema, cadastro de médicos, criação de novos usuários e alteração de níveis de permissão em cada cargo.

![Painel Administrativo](./public/screenshots/admin.png)

*   **Controle de Unidades:** Cadastro e vínculo de servidores públicos às respectivas Unidades Básicas de Saúde (UBS).
*   **Granularidade:** Painel interativo para habilitar/desabilitar permissões específicas de cada papel corporativo.

---

### 8. Rastreabilidade e Auditoria (LGPD)
Para atender à legislação brasileira de proteção de dados pessoais sensíveis, o PSF Digital monitora todas as alterações feitas no banco de dados.

![Trilha de Auditoria](./public/screenshots/auditoria.png)

*   **Logs Detalhados:** Registro detalhado contendo Data/Hora, Usuário Operador, Tabela Alvo, Ação executada (CREATE, UPDATE, DELETE), IP de origem e User Agent.
*   **Mudança de Valores (Diff):** Armazenamento em JSON comparativo contendo o estado anterior e o novo estado do registro modificado.

---

## 🛠️ Instalação e Execução Local

### Pré-requisitos
*   [Node.js (versão 20 ou superior)](https://nodejs.org/)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (caso queira rodar o PostgreSQL via contêiner)

### Passos para Configuração

1.  **Clonar o Repositório:**
    ```bash
    git clone https://github.com/usuario/agendamento-psf.git
    cd agendamento-psf
    ```

2.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto e configure as chaves de conexão (você pode copiar o modelo abaixo):
    ```env
    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/agendamento_psf?schema=public"
    JWT_SECRET="a7c4f42f36d4f40bb8e9b6267cbdfb09b53f65e23652a92ff15ad97e59b7dfb36a8d6263e52"
    JWT_REFRESH_SECRET="9e52d6a5991823ebdfcf6d3e8e19bb5a1b3fc14421bfa9822a105c93bd8c8a14b5398d5c"
    NODE_ENV="development"
    ```

3.  **Iniciar o Banco de Dados (Docker):**
    Caso utilize o Docker Compose configurado no projeto para subir o banco PostgreSQL:
    ```bash
    docker-compose up -d db
    ```

4.  **Instalar Dependências:**
    ```bash
    npm install
    ```

5.  **Rodar as Migrações do Prisma & Seed Data:**
    Crie a estrutura das tabelas no banco de dados e popule-as com os dados de teste (município, usuários e medicamentos iniciais):
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

6.  **Iniciar o Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```
    O sistema estará disponível em [http://localhost:3000](http://localhost:3000).

---

## 👤 Credenciais de Teste

Para navegar pela plataforma e testar os diferentes fluxos operacionais, utilize o identificador de município (Slug) `exemplo` com os seguintes perfis configurados no Seed:

| Perfil | E-mail corporativo | Senha | Acesso principal |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@exemplo.gov.br` | `admin123` | Painel Geral, Auditoria de Logs, Criação de Usuários |
| **Médico** | `medico@exemplo.gov.br` | `medico123` | Painel de Atendimento Clínico, Receitas, Exames |
| **Recepcionista** | `recepcao@exemplo.gov.br` | `recepcao123` | Cadastro de Pacientes, Agendamento e Cancelamento |
| **Farmacêutico** | `farmacia@exemplo.gov.br` | `farmacia123` | Gerenciamento de Medicamentos, Saídas e Entradas |
| **Gestor Municipal** | `gestor@exemplo.gov.br` | `gestor123` | Gráficos de Produção e Relatórios Administrativos |

---

## 🔒 Proteção de Dados (LGPD)

O PSF Digital armazena e processa dados clínicos e cadastrais confidenciais em conformidade com as diretrizes da Lei Geral de Proteção de Dados (LGPD):
*   Todas as ações que modifiquem dados pessoais de pacientes são registradas de forma indelével na tabela `AuditLog`.
*   Acesso aos prontuários e receitas é restrito por chaves criptográficas de sessão (JWT) e validado no servidor baseando-se nos papéis atribuídos ao profissional ativo.
*   Criptografia de ponta-a-ponta nos bancos corporativos.
