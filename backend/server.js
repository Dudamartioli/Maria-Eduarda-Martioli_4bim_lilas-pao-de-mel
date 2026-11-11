
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Carrega as configurações do .env
dotenv.config();

// Cria o servidor
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Importa as rotas
const produtoRoutes = require("./routes/produtoRoutes");

// Utiliza as rotas dos produtos
app.use("/produto", produtoRoutes);

// Porta do servidor
const PORT = 3001;

// Inicia o servidor
app.listen(PORT, () => {
    console.log("Servidor executando na porta " + PORT);
});
