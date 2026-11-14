
// ==========================================
// LILA'S - MINHA CONTA
// ==========================================

// Endereço do backend
const URL_API = "http://localhost:3001";
// Executa as funções quando a página carregar
window.onload = function() {

    // Verifica se o usuário está logado
    verificarLogin();

    // Configura os botões da página
    configurarBotoes();
};

// ==========================================
// VERIFICAR LOGIN
// ==========================================

async function verificarLogin() {

    try {

        // Consulta o servidor para verificar o cookie
        const resposta = await fetch(URL_API + "/usuario/verificar", {
            credentials: "include"
        });

        // Converte a resposta para JSON
        const dados = await resposta.json();

        // Verifica se o usuário está autenticado
        if (resposta.ok && dados.sucesso) {

            // Mostra o nome do usuário
            document.getElementById("nomeUsuario").textContent =
                dados.usuario.nome;

            // Mostra o e-mail do usuário
            document.getElementById("emailUsuario").textContent =
                dados.usuario.email;

            // Recupera o tipo do usuário
            const tipoUsuario = dados.usuario.tipo_usuario;

            // Recupera o botão de administração
            const btnAdministracao =
                document.getElementById("btnAdministracao");

            // Somente usuários ambos podem trocar de área
            if (tipoUsuario === "ambos") {

                btnAdministracao.hidden = false;

            } else {

                btnAdministracao.hidden = true;
            }

        } else {

            // Redireciona para o login
            window.location.href = "../login/login.html";
        }

    } catch (erro) {

        // Mostra o erro no console
        console.log("Erro ao verificar login:", erro);

        // Informa que não foi possível verificar a sessão
        LilaAvisos.alerta("Não foi possível verificar sua conta.");

        // Volta para a página inicial
        window.location.href = "../menu/menu.html";
    }
}

// ==========================================
// CONFIGURAR BOTÕES
// ==========================================

function configurarBotoes() {

    // Recupera o botão de alterar senha
    const btnAlterarSenha = document.getElementById("btnAlterarSenha");

    // Recupera o botão de pedidos
    const btnPedidos = document.getElementById("btnPedidos");

    // Recupera o botão de administração
    const btnAdministracao =
        document.getElementById("btnAdministracao");

    // Recupera o botão de sair
    const btnSair = document.getElementById("btnSair");

    // Configura a alteração de senha
    btnAlterarSenha.onclick = function() {

        LilaAvisos.alerta("Em breve você poderá alterar sua senha por aqui!");
    };

    // Configura o histórico de pedidos
    btnPedidos.onclick = function() {

        LilaAvisos.alerta("Em breve você poderá consultar seus pedidos!");
    };

    // Configura a entrada na administração
    btnAdministracao.onclick = entrarAdministracao;

    // Configura o logout
    btnSair.onclick = logout;
}

// ==========================================
// ENTRAR NA ADMINISTRAÇÃO
// ==========================================

async function entrarAdministracao() {

    try {

        // Verifica a permissão administrativa no backend
        const resposta = await fetch(URL_API + "/admin/verificar", {
            credentials: "include"
        });

        // Recebe a resposta do servidor
        const dados = await resposta.json();

        // Se o acesso for permitido, abre o painel
        if (resposta.ok && dados.sucesso) {

            window.location.href = "../administrador/admin.html";

        } else {

            // Informa que o acesso não foi permitido
            LilaAvisos.alerta("Você não possui permissão administrativa.");
        }

    } catch (erro) {

        // Mostra o erro no console
        console.log("Erro ao acessar administração:", erro);

        // Informa o problema
        LilaAvisos.alerta("Não foi possível acessar a administração.");
    }
}

// ==========================================
// SAIR DA CONTA
// ==========================================

async function logout() {

    try {

        // Solicita o logout ao servidor
        const resposta = await fetch(URL_API + "/usuario/logout", {
            method: "POST",
            credentials: "include"
        });

        // Converte a resposta para JSON
        const dados = await resposta.json();

        // Verifica se o logout funcionou
        if (resposta.ok && dados.sucesso) {

            // Informa que o usuário saiu da conta
            LilaAvisos.alerta("Você saiu da sua conta com sucesso!");

            // Volta para a página inicial
            window.location.href = "../menu/menu.html";

        } else {

            // Mostra a mensagem enviada pelo servidor
            LilaAvisos.alerta(dados.mensagem);
        }

    } catch (erro) {

        // Mostra o erro no console
        console.log("Erro ao sair da conta:", erro);

        // Informa o problema
        LilaAvisos.alerta("Não foi possível sair da conta.");
    }
}
