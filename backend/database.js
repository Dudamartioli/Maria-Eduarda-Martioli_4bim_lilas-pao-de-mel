
const { Pool } = require("pg");
require("dotenv").config();

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Exporta a conexão para os controllers
module.exports = pool;
