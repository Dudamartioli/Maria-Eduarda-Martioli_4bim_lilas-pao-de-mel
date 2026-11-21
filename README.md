<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:FFE49A,50:E9BC6C,100:5C3A2E&height=190&section=header&text=Lila's%20%E2%80%93%20P%C3%A3o%20de%20Mel&fontSize=38&fontColor=5C3A2E&fontAlignY=38&desc=Do%20carinho%20de%20cada%20receita%20%C3%A0%20praticidade%20de%20cada%20pedido&descAlignY=62&descSize=15" alt="Banner Lila's – Pão de Mel" />

**Uma loja virtual desenvolvida para um negócio real.** 🍯

![HTML5](https://img.shields.io/badge/HTML5-FFF3D1?style=for-the-badge&logo=html5&logoColor=5C3A2E)
![CSS3](https://img.shields.io/badge/CSS3-FFF3D1?style=for-the-badge&logo=css&logoColor=5C3A2E)
![JavaScript](https://img.shields.io/badge/JavaScript-FFE49A?style=for-the-badge&logo=javascript&logoColor=5C3A2E)
![Node.js](https://img.shields.io/badge/Node.js-FFE49A?style=for-the-badge&logo=node.js&logoColor=5C3A2E)
![Express](https://img.shields.io/badge/Express-FFF3D1?style=for-the-badge&logo=express&logoColor=5C3A2E)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-FFE49A?style=for-the-badge&logo=postgresql&logoColor=5C3A2E)

</div>

---

## 🍯 Sobre o projeto

**Lila's – Pão de Mel** é uma aplicação web criada como projeto da disciplina **Desenvolvimento Web 1**, na **Universidade Tecnológica Federal do Paraná (UTFPR)**, em 2026.

A proposta nasceu de uma necessidade real: ajudar uma empreendedora a organizar a venda de pães de mel, reunindo em um único sistema o catálogo, os pedidos, o atendimento e a administração do negócio.

O desenvolvimento envolveu compreender as necessidades da usuária, definir regras de negócio e transformá-las em funcionalidades. Assim, o projeto aproxima o aprendizado de programação das etapas de análise e construção de software para um cliente real.

## ✨ Funcionalidades

<table>
<tr>
<td width="50%" valign="top">

### 🛍️ Área do cliente

- Catálogo de produtos, fotos e sabores
- Seleção de quantidades e carrinho de compras
- Checkout com entrega ou retirada
- Cálculo de frete por localidade
- Aplicação de cupons e descontos
- Pagamento por Pix e envio opcional de comprovante
- Consulta de pedidos e seus status
- Cadastro, login e recuperação de senha

</td>
<td width="50%" valign="top">

### 🍫 Área administrativa

- Gerenciamento de usuários e permissões
- CRUD de produtos, categorias e sabores
- Estoque por produto e sabor
- Gerenciamento de pedidos e pagamentos
- Cadastro de fretes e cupons
- Banners e mensagens promocionais
- Bloqueios da agenda de produção e entrega
- Acompanhamento financeiro e relatórios

</td>
</tr>
</table>

## 🧩 Regras de negócio

<details>
<summary><strong>📅 Produção, estoque e agendamento</strong></summary>

- Não são permitidas entregas ou retiradas no mesmo dia do pedido.
- Pedidos de até 20 unidades de pão de mel grande podem ser agendados para o dia seguinte, desde que haja estoque pronto e disponibilidade na agenda.
- Pedidos acima de 20 unidades exigem antecedência de 7 dias.
- Pães de mel mini são produzidos sob encomenda e exigem antecedência de 7 dias.
- A administração pode bloquear datas para produção, entregas/retiradas ou ambos.

</details>

<details>
<summary><strong>💳 Pagamento, descontos e pedidos</strong></summary>

- O pagamento é realizado por Pix.
- A confirmação do recebimento é feita pela administração após conferência do pagamento.
- Há desconto automático de 5% para pedidos com mais de 100 unidades, conforme as regras do sistema.
- Quando um cupom e o desconto automático forem aplicáveis, prevalece o maior benefício, sem acumulação.
- Pedidos cancelados podem exigir acompanhamento de reembolso.

</details>

<details>
<summary><strong>🔐 Perfis de acesso</strong></summary>

- **Cliente:** acesso à loja e às próprias compras.
- **Administrador:** acesso ao painel de gerenciamento.
- **Ambos:** possibilidade de alternar entre a loja e a administração.

</details>

## 🛠️ Tecnologias e arquitetura

| Camada | Tecnologias |
|---|---|
| Interface | HTML5, CSS3 e JavaScript |
| Servidor | Node.js e Express |
| Banco de dados | PostgreSQL |
| Autenticação | Sessões, cookies e validação no backend |
| Recuperação de senha | Nodemailer |

O sistema separa as responsabilidades do **frontend** e do **backend**, utilizando rotas, controladores e serviços para organizar a lógica da aplicação.

## 🚀 Como executar localmente

<details>
<summary><strong>Ver instruções de instalação</strong></summary>

### Pré-requisitos

- Node.js e npm
- PostgreSQL
- Um editor de código, como o VS Code

### 1. Clonar o repositório

```bash
git clone URL_DO_SEU_REPOSITORIO
cd NOME_DO_REPOSITORIO
```

### 2. Instalar as dependências do backend

```bash
cd backend
npm install
```

### 3. Preparar o banco de dados

Crie um banco PostgreSQL e execute os scripts SQL disponibilizados no repositório, seguindo a ordem indicada neles.

### 4. Configurar o ambiente

Configure o arquivo `.env` do backend com as variáveis exigidas pelo projeto. **Não publique credenciais reais nem o arquivo `.env` no GitHub.**

### 5. Iniciar o servidor

```bash
node server.js
```

Por padrão, o backend do projeto utiliza a porta **3001**.

### 6. Abrir o frontend

Abra a página inicial do frontend usando um servidor local, como a extensão **Live Server** do VS Code (comumente na porta **5500**).

> **Importante:** confira os caminhos dos scripts SQL, a configuração das variáveis de ambiente e o arquivo de entrada do frontend antes de publicar estas instruções como definitivas.

</details>

## 🔒 Segurança

O projeto contempla autenticação com cookies, verificação de sessão, autorização por perfil e validação de dados no servidor. Informações sensíveis, como senhas e credenciais, não devem ser incluídas no repositório público.

## 🎓 Contexto acadêmico

- **Instituição:** Universidade Tecnológica Federal do Paraná (UTFPR)
- **Disciplina:** Desenvolvimento Web 1
- **Período:** 4º bimestre de 2026
- **Projeto:** Aplicação web para gerenciamento de uma loja de pães de mel
- **Desenvolvimento:** Maria Eduarda Martioli

Este projeto representa a aplicação prática de conceitos de desenvolvimento web, banco de dados, autenticação, interfaces e levantamento de requisitos em uma solução pensada para uma necessidade real.

---

<div align="center">

**Feito com dedicação, aprendizado e um toque de mel. 🍯🤎**

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:5C3A2E,50:E9BC6C,100:FFE49A&height=100&section=footer" alt="Rodapé decorativo" />

</div>
