/* ========================================
   LILA'S PÃO DE MEL
   CADASTRO E LOGIN
   ======================================== */

// Endereço do backend
const URL_API = "http://localhost:3001";


// ========================================
// CADASTRO
// ========================================

// Procura o formulário de cadastro
const formCadastro = document.getElementById("formCadastro");

// Verifica se estamos na tela de cadastro
if (formCadastro) {

    formCadastro.onsubmit = async function(event) {

        // Impede o recarregamento da página
        event.preventDefault();

        // Recebe os dados preenchidos
        const nome = document.getElementById("nome").value;
        const email = document.getElementById("email").value;
        const telefone = document.getElementById("telefone").value;
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        // Local onde aparecerão as mensagens
        const mensagem = document.getElementById("mensagem");

        // Verifica se as senhas são iguais
        if (senha !== confirmarSenha) {

            mensagem.textContent = "As senhas não são iguais.";
            return;
        }

        try {

            // Envia o cadastro para o backend
            const resposta = await fetch(URL_API + "/usuario/cadastrar", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    nome: nome,
                    email: email,
                    telefone: telefone,
                    senha: senha
                })
            });

            // Recebe o resultado
            const dados = await resposta.json();

            // Verifica se cadastrou corretamente
            if (resposta.ok && dados.sucesso) {

                mensagem.textContent = dados.mensagem;

                // Limpa os campos
                formCadastro.reset();

                // Abre a página de login
                setTimeout(function() {

                    window.location.href = "login.html";

                }, 1500);

            } else {

                mensagem.textContent = dados.mensagem;
            }

        } catch (erro) {

            mensagem.textContent = "Erro ao conectar ao servidor.";
            console.log("Erro no cadastro:", erro);
        }
    };
}


// ========================================
// LOGIN COM COOKIES
// ========================================

// Procura o formulário de login
const formLogin = document.getElementById("formLogin");

// Verifica se estamos na tela de login
if (formLogin) {

    formLogin.onsubmit = async function(event) {

        // Impede o recarregamento da página
        event.preventDefault();

        // Recebe os dados
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;

        // Local onde aparecerão as mensagens
        const mensagem = document.getElementById("mensagem");

        try {

            // Envia as credenciais para validação
            const resposta = await fetch(URL_API + "/usuario/login", {

                method: "POST",

                // Permite receber o cookie do backend
                credentials: "include",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    senha: senha
                })
            });

            // Recebe a resposta
            const dados = await resposta.json();

            if (dados.senhaNaoDefinida) {
                document.getElementById("senha").value = "";
                formLogin.hidden = true;
                formLogin.style.display = "none";
                mensagem.textContent = "";
                const painel = document.getElementById("definirSenha");
                painel.hidden = false;
                const botao = document.getElementById("enviarLinkSenha");
                botao.disabled = false;
                document.getElementById("voltarLogin").onclick = () => {
                    painel.hidden = true;
                    formLogin.hidden = false;
                    formLogin.style.display = "";
                    mensagem.textContent = "";
                };
                botao.onclick = async () => {
                    botao.disabled = true;
                    mensagem.textContent = "Enviando link...";
                    try {
                        const r = await fetch(URL_API + "/recuperacao/solicitar", {
                            method: "POST", headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({email, primeiroAcesso: true})
                        });
                        const d = await r.json();
                        mensagem.textContent = d.mensagem;
                    } catch (erro) {
                        mensagem.textContent = "Não foi possível conectar ao servidor.";
                    } finally { botao.disabled = false; }
                };
                return;
            }
            // Verifica se o login foi autorizado
            if (resposta.ok && dados.sucesso) {

                mensagem.textContent = "Login realizado com sucesso!";

                // Retorna ao checkout se o login foi iniciado pelo carrinho.
                const tipo_usuario = dados.usuario.tipo_usuario;

const veioCheckout =
    sessionStorage.getItem("lilas_voltar_checkout") === "1";

sessionStorage.removeItem("lilas_voltar_checkout");

// ADMINISTRADOR
if (tipo_usuario === "admin") {

    if (veioCheckout) {

        formLogin.style.display = "none";

        mensagem.innerHTML = `
            <div class="aviso-admin">
                <div class="aviso-admin-icone">🍯</div>

                <h2>Acesso administrativo</h2>

                <p>
                    Esta conta possui acesso exclusivo à
                    administração da Lila's.
                </p>

                <p>
                    Para realizar compras, entre com uma
                    conta de cliente.
                </p>

                <a href="../administrador/admin.html"
                   class="botao-admin">
                    Abrir painel administrativo
                </a>
            </div>
        `;

        return;
    }

    window.location.href = "../administrador/admin.html";
    return;
}

// CLIENTE
if (tipo_usuario === "cliente") {

    window.location.href = veioCheckout
        ? "../checkout/checkout.html"
        : "../menu/menu.html";

    return;
}

// AMBOS
if (tipo_usuario === "ambos") {

    if (veioCheckout) {
        window.location.href = "../checkout/checkout.html";
    } else {
        window.location.href =
            "../escolher-acesso/escolher-acesso.html";
    }

    return;
}

mensagem.textContent = "Tipo de usuário não reconhecido.";

            } else {

                mensagem.textContent = dados.mensagem;
            }

        } catch (erro) {

            mensagem.textContent = "Erro ao conectar ao servidor.";
            console.log("Erro no login:", erro);
        }
    };
}
