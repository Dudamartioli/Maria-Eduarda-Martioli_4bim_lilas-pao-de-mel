// CRUD administrativo de usuários - Lila's Pão de Mel
const pool = require('../database');
const bcrypt = require('bcryptjs');

// Campos públicos: nunca retornar senha_hash.
const campos = 'id_usuario, nome, email, telefone, tipo_usuario, data_cadastro';
const tipos = ['cliente', 'admin', 'ambos'];
const idValido = id => /^[1-9]\d*$/.test(String(id));
const emailValido = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const erroServidor = (res, erro) => {
    console.error('Erro no CRUD de usuários:', erro);
    if (erro.code === '23505') return res.status(409).json({ sucesso: false, mensagem: 'Este e-mail já está cadastrado.' });
    if (erro.code === '23503') return res.status(409).json({ sucesso: false, mensagem: 'Este usuário possui registros vinculados e não pode ser excluído.' });
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar usuário.' });
};

// GET /admin/usuario/listar
const listar = async (req, res) => {
    try {
        const resultado = await pool.query(`SELECT ${campos} FROM usuario ORDER BY id_usuario`);
        res.json({ sucesso: true, usuarios: resultado.rows });
    } catch (erro) { erroServidor(res, erro); }
};

// GET /admin/usuario/:id
const procurar = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const resultado = await pool.query(`SELECT ${campos} FROM usuario WHERE id_usuario = $1`, [req.params.id]);
        if (!resultado.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        res.json({ sucesso: true, usuario: resultado.rows[0] });
    } catch (erro) { erroServidor(res, erro); }
};

// POST /admin/usuario - somente administradores podem escolher o tipo.
const inserir = async (req, res) => {
    const { nome, email, telefone, senha, tipo_usuario } = req.body || {};
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
        typeof email !== 'string' || !emailValido(email.trim()) || email.trim().length > 100 ||
        typeof senha !== 'string' || senha.length < 6 || !tipos.includes(tipo_usuario) ||
        (telefone != null && (typeof telefone !== 'string' || telefone.length > 20))) {
        return res.status(400).json({ sucesso: false, mensagem: 'Confira nome, e-mail, senha (mínimo 6 caracteres), telefone e tipo.' });
    }
    try {
        const hash = await bcrypt.hash(senha, 10);
        const resultado = await pool.query(
            `INSERT INTO usuario (nome, email, telefone, senha_hash, tipo_usuario)
             VALUES ($1, $2, $3, $4, $5) RETURNING ${campos}`,
            [nome.trim(), email.trim().toLowerCase(), telefone?.trim() || null, hash, tipo_usuario]
        );
        res.status(201).json({ sucesso: true, mensagem: 'Usuário cadastrado.', usuario: resultado.rows[0] });
    } catch (erro) { erroServidor(res, erro); }
};

// PUT /admin/usuario/:id - senha não é alterada neste formulário.
const alterar = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    const { nome, email, telefone, tipo_usuario } = req.body || {};
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
        typeof email !== 'string' || !emailValido(email.trim()) || email.trim().length > 100 ||
        !tipos.includes(tipo_usuario) ||
        (telefone != null && (typeof telefone !== 'string' || telefone.length > 20))) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados do usuário inválidos.' });
    }
    // Impede remover a própria permissão administrativa.
    if (Number(req.params.id) === Number(req.usuario.id_usuario) && tipo_usuario === 'cliente') {
        return res.status(403).json({ sucesso: false, mensagem: 'Você não pode retirar seu próprio acesso administrativo.' });
    }
    try {
        const resultado = await pool.query(
            `UPDATE usuario SET nome = $1, email = $2, telefone = $3, tipo_usuario = $4
             WHERE id_usuario = $5 RETURNING ${campos}`,
            [nome.trim(), email.trim().toLowerCase(), telefone?.trim() || null, tipo_usuario, req.params.id]
        );
        if (!resultado.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        res.json({ sucesso: true, mensagem: 'Usuário alterado.', usuario: resultado.rows[0] });
    } catch (erro) { erroServidor(res, erro); }
};

// DELETE /admin/usuario/:id
const excluir = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    if (Number(req.params.id) === Number(req.usuario.id_usuario)) {
        return res.status(403).json({ sucesso: false, mensagem: 'Você não pode excluir sua própria conta.' });
    }
    try {
        // Preserva histórico de pedidos e impede exclusão de contas vinculadas.
        const pedidos = await pool.query('SELECT 1 FROM pedido WHERE id_usuario = $1 LIMIT 1', [req.params.id]);
        if (pedidos.rows.length) return res.status(409).json({ sucesso: false, mensagem: 'Usuário possui pedidos e não pode ser excluído.' });
        // recuperacao_senha tem ON DELETE CASCADE no banco atual.
        const resultado = await pool.query('DELETE FROM usuario WHERE id_usuario = $1 RETURNING id_usuario', [req.params.id]);
        if (!resultado.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        res.json({ sucesso: true, mensagem: 'Usuário excluído.' });
    } catch (erro) { erroServidor(res, erro); }
};

module.exports = { listar, procurar, inserir, alterar, excluir };
