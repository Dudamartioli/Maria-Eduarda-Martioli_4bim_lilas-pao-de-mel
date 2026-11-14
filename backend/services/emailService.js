
const nodemailer = require("nodemailer");

// Configura o envio de e-mails pelo Gmail
const transportador = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USUARIO,
        pass: process.env.EMAIL_SENHA
    }
});

// Função que envia o link de recuperação
const enviarEmailRecuperacao = async (email, link) => {

    // Define os dados da mensagem
    const mensagem = {
        from: process.env.EMAIL_USUARIO,
        to: email,
        subject: "Lila's - Recuperação de senha",

        text:
            "Olá!\n\n" +
            "Recebemos uma solicitação para redefinir sua senha.\n\n" +
            "Acesse o link abaixo:\n" +
            link + "\n\n" +
            "O link é válido por 15 minutos.\n\n" +
            "Se você não solicitou a recuperação, ignore este e-mail.\n\n" +
            "Lila's Pão de Mel"
    };

    // Envia o e-mail
    await transportador.sendMail(mensagem);
};

// Exporta a função
module.exports = {
    enviarEmailRecuperacao
};
