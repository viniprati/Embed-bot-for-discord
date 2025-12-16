````md
# 🤖 Template — Bot Gerador de Embeds (Discord.js v14)

Um template simples de bot para Discord que cria **embeds via Slash Command** usando **Modal** (formulário).  
Ideal pra servidores que querem criar anúncios, tabelas de preço, avisos, regras, etc — rápido e bonito.

---

## ✅ O que esse bot faz

- Comando **/embed** abre um **modal** com:
  - Título
  - Descrição
  - Cor (Hex)
  - Link de imagem (opcional)
- Envia a embed no canal onde o comando foi usado
- Suporta **emojis do servidor** digitando no texto `:nome_do_emoji:` (ele tenta substituir automaticamente)

---

## 📦 Requisitos

- **Node.js 18+** (recomendado)
- Um bot criado no **Discord Developer Portal**
- Permissões pra o bot:
  - Enviar mensagens
  - Inserir links
  - Embed links
  - (opcional) Anexar arquivos/imagens, se for usar imagens externas

---

## 🚀 Instalação manual (passo a passo)

### 1) Baixe o projeto
Clone ou baixe o repositório:

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO
````

### 2) Instale as dependências

```bash
npm install
```

### 3) Crie o arquivo `.env`

Na raiz do projeto, crie um arquivo chamado **.env** e coloque:

```env
TOKEN=SEU_TOKEN_DO_BOT
CLIENT_ID=SEU_CLIENT_ID_DO_BOT
```

📌 Onde achar:

* `TOKEN`: Developer Portal → **Bot** → Token
* `CLIENT_ID`: Developer Portal → **General Information** → Application ID (é o client id)

> ⚠️ Nunca suba o `.env` pro GitHub. Coloque `.env` no `.gitignore`.

### 4) Inicie o bot

```bash
node index.js
```

Se estiver tudo certo, você vai ver algo tipo:

* `✅ Bot logado como ...`
* `✅ Comandos prontos!`

---

## 🔗 Como convidar o bot pro servidor

1. Developer Portal → **OAuth2** → **URL Generator**
2. Marque:

   * **Scopes**: `bot` e `applications.commands`
   * **Bot Permissions** (mínimo recomendado):

     * Send Messages
     * Embed Links
     * Read Message History
     * Use External Emojis (opcional)
3. Copie o link gerado e convide no seu servidor.

---

## 🧠 Como usar

No seu servidor:

### `/embed`

Vai abrir um formulário.

**Dicas de descrição**
Você pode usar markdown do Discord, por exemplo:

```txt
> :dinheiro: **Básico:** R$150
> :shield: **Moderação:** R$300
> :tickets: **Tickets:** R$300
```

**Emojis do servidor**
Digite no texto:

* `:nomedoemoji:`

O bot tenta trocar pelo emoji real do servidor automaticamente.

---

## 🎨 Cor da embed (Hex)

Exemplos válidos:

* `#2b2d31`
* `#5865F2`
* `#00FF88`

Se você deixar em branco, ele usa a padrão do modal (no código está `#2b2d31`).

---

## 📁 Estrutura sugerida do projeto

Exemplo básico:

```txt
.
├─ index.js
├─ package.json
├─ .env (não subir)
└─ README.md
```

---

## ⚠️ Observações importantes

* Os **slash commands** são registrados quando o bot liga (`Routes.applicationCommands(CLIENT_ID)`).

  * Isso registra **globalmente** (pode demorar alguns minutos pra aparecer em todos servidores).
* O bot tenta buscar emojis com `client.emojis.cache` — isso depende dele estar em servidores e ter carregado o cache.

---

## 🛠️ Personalização rápida

Quer mudar textos do modal?
Procure por:

* `.setTitle('Criar Anúncio')`
* labels como `"Título"`, `"Descrição"`, etc.

Quer mudar o nome do comando?
Procure:

* `.setName('embed')`

---

## 📜 Licença

Use como quiser (recomendado adicionar uma licença tipo MIT no repositório).

---

## ⭐ Créditos

Template base feito para facilitar criação de embeds via modal em Discord.js v14.

