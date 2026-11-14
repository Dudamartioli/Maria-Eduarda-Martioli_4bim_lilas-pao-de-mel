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

            // Verifica se o login foi autorizado
            if (resposta.ok && dados.sucesso) {

                mensagem.textContent = "Login realizado com sucesso!";

                // Retorna ao checkout se o login foi iniciado pelo carrinho.
                if (sessionStorage.getItem("lilas_voltar_checkout") === "1") {
                    sessionStorage.removeItem("lilas_voltar_checkout");
                    window.location.href = "../checkout/checkout.html";
                    return;
                }

                // Recupera o tipo do usuário
                const tipo_usuario = dados.usuario.tipo_usuario;

                // Aguarda um segundo antes de mudar a página
                setTimeout(function() {

                    // Cliente acessa a loja
                    if (tipo_usuario === "cliente") {

                        window.location.href = "http://localhost:3001/menu/menu.html";

                    // Administrador acessa a área administrativa
                    } else if (tipo_usuario === "admin") {

                        // Temporariamente, até criarmos o painel
                        window.location.href =
                            "../escolher-acesso/escolher-acesso.html";

                    // Usuário com as duas permissões escolhe o acesso
                    } else if (tipo_usuario === "ambos") {

                        window.location.href =
                            "../escolher-acesso/escolher-acesso.html";

                    } else {

                        mensagem.textContent =
                            "Tipo de usuário não reconhecido.";
                    }

                }, 1000);

            } else {

                mensagem.textContent = dados.mensagem;
            }

        } catch (erro) {

            mensagem.textContent = "Erro ao conectar ao servidor.";
            console.log("Erro no login:", erro);
        }
    };
}
