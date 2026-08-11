# Configurar login permanente do Git (parar de pedir autenticação)

## Por que fazer isso
O login salvo do GitHub (OAuth) expira de tempos em tempos — e aí o `push` trava pedindo
login. Vamos trocar por um **token (PAT)** que **não expira** e fica salvo no seu computador.
Depois disso, os scripts de envio (`empurrar`, `enviar-...`) funcionam sem pedir login.

---

## Passo 1 — Criar o token no GitHub

1. Acesse: **https://github.com/settings/tokens/new**
   (menu: Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token (classic).)
   Se pedir senha/2FA, confirme.
2. Preencha:
   - **Note:** `LexFlow deploy`
   - **Expiration:** `No expiration` (ou 1 ano)
   - **Scopes (permissões):** marque **`repo`** (dá acesso aos seus repositórios).
3. Clique **Generate token** e **COPIE o token** — ele começa com `ghp_...` e **só aparece uma vez**.
   Guarde num lugar seguro (ex.: bloco de notas temporário).

> Opção mais segura (opcional): em vez do classic, use **Fine-grained tokens**, dando acesso
> **só ao repositório `lexflow-`**, com permissão **Contents: Read and write**.

---

## Passo 2 — Rodar o script

1. Duplo-clique em **`configurar-git.bat`** (nesta mesma pasta).
2. Ele mostra instruções e pede para apertar uma tecla. Depois envia um commit de teste só para
   ativar o login.
3. Quando o console (janela preta) perguntar:
   - **`Username for 'https://github.com':`** → digite **`francolbm`** e Enter.
   - **`Password for ...:`** → **COLE o token** e Enter.
     (No console, para colar: clique com o **botão direito** do mouse.)
4. Se aparecer **"PRONTO"**, acabou. O Git **não vai mais pedir login** nos próximos envios.

---

## Observação de segurança

O token fica salvo em texto no arquivo `C:\Users\User\.git-credentials` (somente no seu
computador). É prático e seguro o suficiente para uso pessoal. Se um dia quiser revogar o acesso,
basta apagar o token em **github.com/settings/tokens** — e/ou apagar aquele arquivo.
