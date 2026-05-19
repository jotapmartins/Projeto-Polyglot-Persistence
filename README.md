# 🎟️ EventFlow — Plataforma de Gestão de Eventos

Sistema web para criação, divulgação e gerenciamento de eventos, desenvolvido com arquitetura **Polyglot Persistence**: uso simultâneo de múltiplos bancos de dados, cada um escolhido de acordo com a natureza dos dados que armazena.

---

## 1. Tema Escolhido

O **EventFlow** é uma plataforma que conecta organizadores de eventos ao público geral. Através dela é possível:

- Cadastrar usuários e empresas organizadoras
- Criar e publicar eventos (com data, local, limite de vagas e valor do ingresso)
- Confirmar ou cancelar presença em eventos
- Visualizar todos os eventos disponíveis em uma tela inicial
- Gerenciar os próprios eventos via dashboard do estabelecimento

O projeto foi desenvolvido como estudo prático de **Polyglot Persistence**, demonstrando como diferentes tipos de banco de dados podem coexistir em uma mesma aplicação, cada um resolvendo melhor um problema específico.

---

## 2. Justificativa dos Bancos e Implementação do Backend

### 🐬 MySQL — Dados Relacionais e Transacionais

**Usado para:** usuários (`cd_usuarios`), confirmações de presença (`ct_confirmacao_presenca`) e associações entre usuário e empresa (`cd_empresas`).

**Justificativa:** Esses dados possuem relacionamentos claros e bem definidos entre si — um usuário pode confirmar presença em vários eventos, e um usuário pode ser dono de uma empresa. O modelo relacional garante integridade referencial, consultas com `JOIN` e controle transacional, características essenciais para dados que exigem consistência forte. O MySQL é a escolha ideal para o núcleo de autenticação e controle de acesso da plataforma.

**Como o backend usa:** pool de conexões via `mysql2`, com queries parametrizadas para cadastro de usuário, login (com verificação de hash via `bcrypt`), confirmação/cancelamento de presença e atualização de perfil.

---

### 🍃 MongoDB — Documentos Flexíveis para Cadastro de Empresas

**Usado para:** cadastro e consulta de empresas organizadoras (`Empresa`).

**Justificativa:** O perfil de uma empresa organizadora possui estrutura variável — especialmente o endereço, que pode ter ou não complemento, e outras informações que tendem a evoluir ao longo do tempo. O modelo de documentos do MongoDB permite armazenar o objeto completo de uma empresa (incluindo o subdocumento de endereço) sem a rigidez de colunas fixas. Isso facilita evolução do schema sem migrações complexas e simplifica leituras, já que todos os dados de uma empresa são retornados em um único documento.

**Como o backend usa:** ODM Mongoose com o model `Empresa`, contendo campos como `razao_social`, `cnpj`, `telefone` e o subdocumento `endereco` (CEP, logradouro, número, bairro, cidade, estado). As operações incluem cadastro, busca por CNPJ (verificação de duplicidade) e busca por `cod_colaborador` para verificar se um usuário já possui empresa.

---

### 🪐 Apache Cassandra (DataStax Astra DB) — Alta Disponibilidade para Eventos

**Usado para:** armazenamento e consulta de eventos (`eventflow_db.eventos`).

**Justificativa:** Eventos são o dado mais acessado da plataforma — a tela inicial carrega todos os eventos disponíveis, e o dashboard de cada empresa lista seus próprios eventos. O Cassandra é projetado para altíssima taxa de leitura e escrita com baixa latência, sendo escalável horizontalmente. A chave de partição `cod_empresa` garante que todos os eventos de uma empresa fiquem co-localizados, tornando as consultas por empresa extremamente eficientes. O uso do **DataStax Astra DB** (Cassandra gerenciado em nuvem) elimina a necessidade de configurar um cluster local.

**Como o backend usa:** driver oficial `cassandra-driver` com prepared statements. As operações cobrem criação de evento (`INSERT`), listagem por empresa (`SELECT WHERE cod_empresa = ?`), listagem geral (`SELECT *`) e exclusão (`DELETE WHERE cod_empresa = ? AND cod_evento = ?`).

---

### ⚙️ Visão Geral do Backend

O backend é uma API REST desenvolvida em **Node.js com Express 5**, servindo também o frontend estático. As três conexões de banco são inicializadas na inicialização do servidor (`server.js`) e compartilhadas entre as rotas.

| Rota | Método | Banco | Descrição |
|---|---|---|---|
| `/cadastrarUsuario` | POST | MySQL | Cadastra novo usuário |
| `/login` | POST | MySQL | Autentica usuário |
| `/atualizar-usuario/:id` | PUT | MySQL | Atualiza perfil do usuário |
| `/confirmar-presenca` | POST | MySQL | Confirma presença em evento |
| `/cancelar-presenca` | DELETE | MySQL | Cancela presença em evento |
| `/presencas/:cod_user` | GET | MySQL | Lista presenças do usuário |
| `/cadastrar-empresa` | POST | MongoDB | Cadastra empresa organizadora |
| `/verificar-empresa/:cod_user` | GET | MongoDB | Verifica se usuário tem empresa |
| `/cadastrar-evento` | POST | Cassandra | Cria novo evento |
| `/eventos` | POST | Cassandra | Lista eventos de uma empresa |
| `/eventos-geral` | GET | Cassandra | Lista todos os eventos |
| `/excluir-evento` | DELETE | Cassandra | Remove um evento |

---

## 3. Como Executar o Projeto

### Pré-requisitos

Certifique-se de ter os itens abaixo instalados e configurados antes de começar:

- [Node.js](https://nodejs.org/) v18 ou superior
- [npm](https://www.npmjs.com/) (já incluso com o Node.js)
- Instância **MySQL** rodando localmente (ou remota)
- Conta no **MongoDB Atlas** com cluster criado — [atlas.mongodb.com](https://www.mongodb.com/atlas)
- Conta no **DataStax Astra DB** com banco Cassandra criado — [astra.datastax.com](https://astra.datastax.com)

---

### Passo 1 — Clonar o repositório

```bash
git clone <url-do-repositorio>
cd Projeto-Polyglot-Persistence
```

---

### Passo 2 — Instalar as dependências

```bash
npm install
```

---

### Passo 3 — Configurar o MySQL

Acesse seu cliente MySQL e execute os comandos abaixo para criar o banco e as tabelas necessárias:

```sql
CREATE DATABASE IF NOT EXISTS eventflow_db;
USE eventflow_db;

CREATE TABLE cd_usuarios (
  cod_user      INT AUTO_INCREMENT PRIMARY KEY,
  nome_user     VARCHAR(100) NOT NULL,
  email_user    VARCHAR(100) NOT NULL UNIQUE,
  cpf_user      VARCHAR(14)  NOT NULL UNIQUE,
  senha         VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ct_confirmacao_presenca (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cod_user   INT NOT NULL,
  cod_evento BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_presenca (cod_user, cod_evento)
);
```

---

### Passo 4 — Configurar o Cassandra (Astra DB)

1. Acesse [astra.datastax.com](https://astra.datastax.com) e crie um banco de dados com o nome `db-eventflow` e keyspace `eventflow_db`.
2. No painel do banco, vá em **Connect → Drivers → Node.js** e baixe o **Secure Connect Bundle** (arquivo `.zip`).
3. Renomeie o arquivo baixado para `secure-connect-db-eventflow.zip` e coloque-o na **raiz do projeto** (mesmo nível do `server.js`).
4. Ainda no painel do Astra, gere um **Token de Aplicação** (papel _Database Administrator_) e anote o `Client ID` e o `Client Secret`.
5. Com o banco criado, acesse o **CQL Console** do Astra e execute:

```cql
USE eventflow_db;

CREATE TABLE IF NOT EXISTS eventos (
  cod_empresa        int,
  cod_evento         bigint,
  nome_evento        text,
  end_evento         text,
  nome_local_evento  text,
  limite_pessoas     int,
  dt_evento          text,
  vl_ingresso        float,
  hr_inicio_evento   text,
  hr_fim_evento      text,
  cidade             text,
  link_imagem        text,
  PRIMARY KEY (cod_empresa, cod_evento)
);
```

---

### Passo 5 — Configurar o MongoDB Atlas

1. Acesse [mongodb.com/atlas](https://www.mongodb.com/atlas) e crie um cluster gratuito (M0).
2. Em **Database Access**, crie um usuário com permissão de leitura e escrita.
3. Em **Network Access**, adicione seu IP (ou `0.0.0.0/0` para liberar qualquer IP durante desenvolvimento).
4. Em **Connect → Drivers**, copie a connection string no formato:
   ```
   mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/
   ```
   A collection `empresas` será criada automaticamente pelo Mongoose no banco `eventflow`.

---

### Passo 6 — Criar o arquivo `.env`

Na raiz do projeto, crie um arquivo chamado `.env` com as seguintes variáveis:

```env
# Servidor
PORT=5521

# MySQL
DB_HOST=localhost
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=eventflow_db

# MongoDB Atlas
MONGO_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/

# Cassandra (Astra DB)
ASTRA_CLIENT_ID=seu_client_id
ASTRA_CLIENT_SECRET=seu_client_secret
```

> ⚠️ O arquivo `.env` já está no `.gitignore`. Nunca o suba para o repositório.

---

### Passo 7 — Iniciar o servidor

```bash
node server.js
```

Se tudo estiver configurado corretamente, você verá no terminal:

```
🚀 Servidor rodando em http://localhost:5521
✅ Conexão com o banco de dados estabelecida com sucesso!
✅ Conexão com o MongoDB estabelecida com sucesso!
✅ Conectado ao Cassandra (Astra DB) com sucesso!
```

Acesse a aplicação em: **http://localhost:5521**

---

## Estrutura do Projeto

```
Projeto-Polyglot-Persistence/
├── db/
│   ├── mongoConnection.js          # Conexão com MongoDB via Mongoose
│   └── cassandraConnection.js      # Conexão com Astra DB (Cassandra)
├── models/
│   └── Empresa.js                  # Schema Mongoose para empresas
├── public/
│   ├── css/                        # Estilos da aplicação
│   ├── js/                         # Scripts do frontend
│   ├── index.html                  # Página de entrada
│   ├── telaInicial.html            # Listagem de eventos (público)
│   ├── cadastro.html               # Cadastro de usuário
│   ├── cadastroEmpresarial.html    # Cadastro de empresa
│   ├── criarEvento.html            # Formulário de criação de evento
│   ├── dashEstabelecimento.html    # Dashboard do organizador
│   └── certificado.html           # Certificado de presença
├── secure-connect-db-eventflow.zip # Bundle de conexão segura do Astra DB
├── server.js                       # Servidor principal e todas as rotas
├── package.json
├── .env                            # Variáveis de ambiente (não versionar)
└── .gitignore
```

---

## Resumo dos Serviços Necessários

| Serviço | Finalidade | Link |
|---|---|---|
| Node.js 18+ | Executar o backend | [nodejs.org](https://nodejs.org) |
| MySQL | Usuários, login e presenças | [mysql.com](https://www.mysql.com) |
| MongoDB Atlas | Cadastro de empresas | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| DataStax Astra DB | Armazenamento de eventos | [astra.datastax.com](https://astra.datastax.com) |
