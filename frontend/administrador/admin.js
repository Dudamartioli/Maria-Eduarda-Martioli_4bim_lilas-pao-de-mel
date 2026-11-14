
/* ==========================================
   LILA'S - PAINEL ADMINISTRATIVO
   ========================================== */

// Endereço do backend
const URL_API = window.location.origin; //"http://localhost:3001";

// Elementos da página
const conteudo = document.getElementById("conteudo");
const aviso = document.getElementById("aviso");
const nomeAdministrador = document.getElementById("nomeAdministrador");
const btnLoja = document.getElementById("btnLoja");
const btnSair = document.getElementById("btnSair");

// ==========================================
// VERIFICAR ACESSO ADMINISTRATIVO
// ==========================================

async function verificarAcesso() {

    try {

        // Verifica se o usuário está autenticado
        const respostaUsuario = await fetch(
            URL_API + "/usuario/verificar",
            {
                credentials: "include"
            }
        );

        const dadosUsuario = await respostaUsuario.json();

        // Se não estiver logado, abre o login
        if (!respostaUsuario.ok || !dadosUsuario.sucesso) {

            window.location.href = "../login/login.html";
            return;
        }

        // Recupera os dados do usuário
        const usuario = dadosUsuario.usuario;

        // Verifica se possui permissão administrativa
        const respostaAdmin = await fetch(
            URL_API + "/admin/verificar",
            {
                credentials: "include"
            }
        );

        const dadosAdmin = await respostaAdmin.json();

        // Bloqueia quem não possui permissão
        if (!respostaAdmin.ok || !dadosAdmin.sucesso) {

            aviso.textContent =
                "Você não possui permissão para acessar esta área.";

            return;
        }

        // Mostra o nome do administrador
        nomeAdministrador.textContent =
            "Olá, " + usuario.nome +
            "! Gerencie sua loja em um só lugar.";

        // O botão de trocar de área aparece somente para ambos
        if (usuario.tipo_usuario === "ambos") {

            btnLoja.hidden = false;
        }

        // Exibe o painel após verificar a permissão
        conteudo.hidden = false;
        aviso.hidden = true;

    } catch (erro) {

        console.log("Erro ao verificar acesso:", erro);

        aviso.textContent =
            "Não foi possível conectar ao servidor.";
    }
}

// ==========================================
// IR PARA A LOJA
// ==========================================

btnLoja.onclick = function() {

    // Abre a página inicial do cliente
    window.location.href = "../menu/menu.html";
};

// ==========================================
// SAIR DA CONTA
// ==========================================

btnSair.onclick = async function() {

    try {

        // Solicita o logout ao backend
        const resposta = await fetch(
            URL_API + "/usuario/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        // Se o logout funcionar, abre a página de login
        if (resposta.ok && dados.sucesso) {

            window.location.href = "../login/login.html";

        } else {

            aviso.hidden = false;
            aviso.textContent =
                "Não foi possível sair da conta.";
        }

    } catch (erro) {

        console.log("Erro ao sair:", erro);

        aviso.hidden = false;
        aviso.textContent =
            "Erro ao conectar ao servidor.";
    }
};

// ==========================================
// INICIAR PÁGINA
// ==========================================

// Verifica o acesso quando a página carregar
window.onload = verificarAcesso;
