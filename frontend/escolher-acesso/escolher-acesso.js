
/* ==========================================
   LILA'S - ESCOLHER ACESSO
   ========================================== */

// Endereço do backend
const URL_API = window.location.origin; //"http://localhost:3001";

// Botões da página
const btnCliente = document.getElementById("btnCliente");
const btnAdministrador = document.getElementById("btnAdministrador");

// Local das mensagens
const aviso = document.getElementById("aviso");

// Guarda o tipo do usuário autenticado
let tipoUsuario = "";

// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        // Consulta a sessão do usuário
        const resposta = await fetch(
            URL_API + "/usuario/verificar",
            {
                credentials: "include"
            }
        );

        // Recebe os dados do backend
        const dados = await resposta.json();

        // Se não estiver autenticado, volta ao login
        if (!resposta.ok || !dados.sucesso) {

            window.location.href = "../login/login.html";
            return;
        }

        // Guarda o tipo do usuário
        tipoUsuario = dados.usuario.tipo_usuario;

        // Cliente comum vai direto para a loja
        if (tipoUsuario === "cliente") {

            window.location.href = "../menu/menu.html";
            return;
        }

        // Administrador exclusivo não precisa escolher
        // Administrador exclusivo acessa diretamente o painel
        if (tipoUsuario === "admin") {

            window.location.href = "../administrador/admin.html";
            return;
        }

        // Usuário com os dois acessos pode escolher
        if (tipoUsuario === "ambos") {

            btnCliente.disabled = false;
            btnAdministrador.disabled = false;

            return;
        }

        // Impede acesso com tipo desconhecido
        aviso.textContent = "Tipo de usuário não reconhecido.";

    } catch (erro) {

        console.log("Erro ao verificar usuário:", erro);

        aviso.textContent =
            "Não foi possível verificar sua conta.";
    }
}

// ==========================================
// ENTRAR COMO CLIENTE
// ==========================================

btnCliente.onclick = function() {

    // Permite somente cliente ou ambos
    if (tipoUsuario === "cliente" ||
        tipoUsuario === "ambos") {

        window.location.href = "../menu/menu.html";

    } else {

        aviso.textContent =
            "Sua conta não possui acesso de cliente.";
    }
};

// ==========================================
// ENTRAR COMO ADMINISTRADOR
// ==========================================

btnAdministrador.onclick = async function() {

    // Verifica a permissão
    if (tipoUsuario !== "admin" &&
        tipoUsuario !== "ambos") {

        aviso.textContent =
            "Você não possui acesso administrativo.";

        return;
    }

    try {

        // Confirma a permissão no backend
        const resposta = await fetch(
            URL_API + "/admin/verificar",
            {
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        // Se o backend autorizar, abre o painel
        if (resposta.ok && dados.sucesso) {

            window.location.href = "../administrador/admin.html";

        } else {

            aviso.textContent = dados.mensagem;
        }

    } catch (erro) {

        console.log("Erro no acesso administrativo:", erro);

        aviso.textContent =
            "Não foi possível conectar ao servidor.";
    }
};

// ==========================================
// INICIAR PÁGINA
// ==========================================

// Impede escolhas antes da verificação
btnCliente.disabled = true;
btnAdministrador.disabled = true;

// Verifica a sessão ao abrir a página
window.onload = verificarUsuario;
