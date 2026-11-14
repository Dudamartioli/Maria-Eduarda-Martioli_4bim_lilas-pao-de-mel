
// Endereço do backend
const URL_API = "http://localhost:3001";

// Recebe os parâmetros do link
const parametros = new URLSearchParams(window.location.search);

// Pega o token enviado pelo e-mail
const token = parametros.get("token");

// Procura o formulário
const formRedefinir = document.getElementById("formRedefinir");

// Procura o elemento de mensagem
const mensagem = document.getElementById("mensagem");

// Verifica se o link possui um token
if (!token) {

    mensagem.textContent = "Link de recuperação inválido.";

    // Impede o envio do formulário
    formRedefinir.querySelector("button").disabled = true;

} else {

    // Executa quando o usuário envia o formulário
    formRedefinir.onsubmit = async function(event) {

        // Impede o recarregamento da página
        event.preventDefault();

        // Recebe as senhas digitadas
        const novaSenha = document.getElementById("novaSenha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        // Verifica se as senhas são iguais
        if (novaSenha !== confirmarSenha) {

            mensagem.textContent = "As senhas não são iguais.";
            return;
        }

        // Verifica o tamanho da senha
        if (novaSenha.length < 6) {

            mensagem.textContent =
                "A senha deve ter pelo menos 6 caracteres.";
            return;
        }

        // Localiza o botão
        const botao = formRedefinir.querySelector("button");

        // Bloqueia o botão durante o envio
        botao.disabled = true;

        try {

            // Envia a nova senha para o backend
            const resposta = await fetch(
                URL_API + "/recuperacao/redefinir",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        token: token,
                        novaSenha: novaSenha
                    })
                }
            );

            // Recebe o resultado
            const dados = await resposta.json();

            // Mostra a mensagem
            mensagem.textContent = dados.mensagem;

            // Verifica se a senha foi alterada
            if (resposta.ok && dados.sucesso) {

                // Limpa os campos
                formRedefinir.reset();

                // Redireciona para o login
                window.location.href = "login.html";

            } else {

                // Libera o botão para nova tentativa
                botao.disabled = false;
            }

        } catch (erro) {

            mensagem.textContent =
                "Não foi possível conectar ao servidor.";

            console.log("Erro ao redefinir senha:", erro);

            botao.disabled = false;
        }
    };
}
