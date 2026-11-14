
const URL_API = window.location.origin; //"http://localhost:3001";

// Procura o formulário de recuperação
const formRecuperar = document.getElementById("formRecuperar");

// Verifica se o formulário existe
if (formRecuperar) {

    // Executa quando o usuário envia o formulário
    formRecuperar.onsubmit = async function(event) {

        // Impede que a página recarregue
        event.preventDefault();

        // Recebe o e-mail digitado
        const email = document.getElementById("email").value;

        // Local onde aparecerá a mensagem
        const mensagem = document.getElementById("mensagem");

        // Localiza o botão de envio
        const botao = formRecuperar.querySelector("button");

        // Evita vários cliques enquanto aguarda
        botao.disabled = true;

        // Mostra uma mensagem
        mensagem.textContent = "Enviando solicitação...";

        try {

            // Chama o backend
            const resposta = await fetch(
                URL_API + "/recuperacao/solicitar",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email
                    })
                }
            );

            // Recebe a resposta do backend
            const dados = await resposta.json();

            // Mostra o resultado
            mensagem.textContent = dados.mensagem;

        } catch (erro) {

            // Mostra um erro de conexão
            mensagem.textContent =
                "Não foi possível conectar ao servidor.";

            console.log("Erro na recuperação:", erro);

        } finally {

            // Libera o botão novamente
            botao.disabled = false;
        }
    };
}
