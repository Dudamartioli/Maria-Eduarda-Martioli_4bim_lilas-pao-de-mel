
const API = '/mensagens';
const $ = id => document.getElementById(id);

let editando = null;
let cupons = [];
let mensagens = [];

/* ==========================================
   COMUNICAÇÃO COM O BACKEND
   ========================================== */

async function req(path, opts = {}) {
    const r = await fetch(API + path, {
        credentials: 'include',
        ...opts
    });

    if (r.status === 401 || r.status === 403) {
        location.href = '../../login/login.html';
        return null;
    }

    const d = await r.json();

    if (!r.ok || !d.sucesso) {
        throw Error(d.mensagem || 'Não foi possível concluir.');
    }

    return d;
}

/* ==========================================
   DADOS DO FORMULÁRIO
   ========================================== */

function dados() {
    return {
        titulo: $('titulo').value.trim(),
        descricao: $('descricao').value.trim(),
        texto_botao: $('texto').value.trim(),
        destino: $('destino').value,
        frequencia: $('frequencia').value,
        id_cupom: $('cupom').value || null,
        prioridade: Number($('prioridade').value),
        ativo: $('ativo').value === 'true'
    };
}

/* ==========================================
   PRÉ-VISUALIZAÇÃO
   ========================================== */

function previa() {
    const d = dados();

    $('prevTitulo').textContent =
        d.titulo || 'Título da mensagem';

    $('prevDescricao').textContent =
        d.descricao || 'Sua mensagem aparecerá aqui.';

    $('prevBotao').textContent =
        d.texto_botao || 'Aproveitar agora';

    const c = cupons.find(
        c => String(c.id_cupom) === String(d.id_cupom)
    );

    $('prevCupom').hidden = !c;

    $('prevCupom').textContent =
        c ? 'Cupom: ' + c.codigo : '';
}

/* ==========================================
   ESTILOS DA TABELA
   ========================================== */

function configurarEstiloTabela() {
    if (document.getElementById('estilo-tabela-mensagens')) {
        return;
    }

    const estilo = document.createElement('style');
    estilo.id = 'estilo-tabela-mensagens';

    estilo.textContent = `
        #lista {
            display: block;
            padding: 18px 22px 24px;
            overflow-x: auto;
        }

        .tabela-mensagens {
            width: 100%;
            min-width: 950px;
            border-collapse: separate;
            border-spacing: 0 10px;
            font-family: 'Jost', sans-serif;
        }

        .tabela-mensagens th {
            padding: 5px 12px;
            text-align: left;
            font-size: .87rem;
            color: #5C3A2E;
            font-weight: 700;
            white-space: nowrap;
        }

        .tabela-mensagens td {
            padding: 15px 12px;
            background: #FFE49A;
            color: #5C3A2E;
            font-size: .88rem;
            vertical-align: middle;
            border-top: 1px solid rgba(92,58,46,.12);
            border-bottom: 1px solid rgba(92,58,46,.12);
        }

        .tabela-mensagens tbody tr {
            filter: drop-shadow(
                2px 4px 5px rgba(185,115,25,.17)
            );
        }

        .tabela-mensagens td:first-child {
            border-left: 1px solid rgba(92,58,46,.12);
            border-radius: 16px 0 0 16px;
            font-weight: 600;
        }

        .tabela-mensagens td:last-child {
            border-right: 1px solid rgba(92,58,46,.12);
            border-radius: 0 16px 16px 0;
        }

        .tabela-mensagens .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 999px;
            font-size: .78rem;
            font-weight: 700;
            white-space: nowrap;
        }

        .tabela-mensagens .status.ativa {
            background: #C7E7A4;
            color: #35652B;
        }

        .tabela-mensagens .status.inativa {
            background: #E8C6B5;
            color: #743D32;
        }

        .tabela-mensagens .acoes-mensagem {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 9px;
            flex-wrap: nowrap;
        }

        .tabela-mensagens .acoes-mensagem button {
            width: auto;
            min-width: 70px;
            margin: 0;
            padding: 9px 14px;
            border: none;
            border-radius: 999px;
            background: linear-gradient(
                145deg, #754A35, #4A2D22
            );
            color: #FFE49A;
            font: 700 .82rem 'Jost', sans-serif;
            white-space: nowrap;
            cursor: pointer;
            box-shadow:
                0 4px 0 #3F2418,
                0 7px 12px rgba(63,36,24,.2);
            transition: transform .2s;
        }

        .tabela-mensagens .acoes-mensagem button:hover {
            transform: translateY(-2px);
        }

        .tabela-mensagens .acoes-mensagem button:active {
            transform: translateY(2px);
        }

        @media (max-width: 600px) {
            #lista {
                padding: 12px;
            }
        }
    `;

    document.head.appendChild(estilo);
}

/* ==========================================
   CRIAR CÉLULA DA TABELA
   ========================================== */

function criarCelula(linha, valor, classe = '') {
    const td = document.createElement('td');

    td.textContent = String(valor ?? '');

    if (classe) {
        td.className = classe;
    }

    linha.appendChild(td);

    return td;
}

/* ==========================================
   FORMATAR FREQUÊNCIA
   ========================================== */

function nomeFrequencia(frequencia) {
    const nomes = {
        primeira: 'Primeira visita',
        sessao: 'Uma vez por sessão',
        sempre: 'Toda visita'
    };

    return nomes[frequencia] || frequencia || '—';
}

/* ==========================================
   EDITAR MENSAGEM
   ========================================== */

function editarMensagem(m) {
    editando = m.id_mensagem;

    const campos = [
        ['titulo', 'titulo'],
        ['descricao', 'descricao'],
        ['texto', 'texto_botao'],
        ['destino', 'destino'],
        ['frequencia', 'frequencia'],
        ['prioridade', 'prioridade']
    ];

    for (const [id, chave] of campos) {
        $(id).value = m[chave] ?? '';
    }

    $('cupom').value = m.id_cupom || '';
    $('ativo').value = String(m.ativo);

    previa();

    $('aviso').textContent = '';

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/* ==========================================
   EXCLUIR MENSAGEM
   ========================================== */

async function excluirMensagem(m) {


    try {
        const resultado = await req('/' + m.id_mensagem, {
            method: 'DELETE'
        });

        if (!resultado) return;

        if (editando === m.id_mensagem) {
            editando = null;
            $('form').reset();
            previa();
        }

        await carregar();

        $('aviso').textContent =
            'Mensagem excluída com sucesso!';

    } catch (e) {
        $('aviso').textContent = e.message;
    }
}

/* ==========================================
   MONTAR TABELA DE MENSAGENS
   ========================================== */

function montarTabela() {
    const lista = $('lista');

    lista.replaceChildren();

    if (!mensagens.length) {
        const vazio = document.createElement('p');

        vazio.textContent =
            'Nenhuma mensagem promocional cadastrada.';

        vazio.style.textAlign = 'center';
        vazio.style.color = '#5C3A2E';

        lista.appendChild(vazio);
        return;
    }

    const tabela = document.createElement('table');
    tabela.className = 'tabela-mensagens';

    const thead = document.createElement('thead');
    const linhaCabecalho = document.createElement('tr');

    const colunas = [
        'Título',
        'Cupom',
        'Botão',
        'Quando mostrar',
        'Prioridade',
        'Status',
        'Ações'
    ];

    for (const nome of colunas) {
        const th = document.createElement('th');
        th.textContent = nome;
        linhaCabecalho.appendChild(th);
    }

    thead.appendChild(linhaCabecalho);

    const tbody = document.createElement('tbody');

    for (const m of mensagens) {
        const linha = document.createElement('tr');

        /* Título */
        criarCelula(linha, m.titulo);

        /* Cupom */
        criarCelula(
            linha,
            m.cupom || 'Sem cupom'
        );

        /* Texto do botão */
        criarCelula(
            linha,
            m.texto_botao || '—'
        );

        /* Frequência */
        criarCelula(
            linha,
            nomeFrequencia(m.frequencia)
        );

        /* Prioridade */
        criarCelula(
            linha,
            m.prioridade ?? 0
        );

        /* Status */
        const tdStatus = document.createElement('td');

        const status = document.createElement('span');

        status.className =
            'status ' + (m.ativo ? 'ativa' : 'inativa');

        status.textContent =
            m.ativo ? 'Ativa' : 'Desativada';

        tdStatus.appendChild(status);
        linha.appendChild(tdStatus);

        /* Ações */
        const tdAcoes = document.createElement('td');

        const acoes = document.createElement('div');
        acoes.className = 'acoes-mensagem';

        const editar = document.createElement('button');
        editar.type = 'button';
        editar.textContent = 'Editar';

        editar.onclick = () => editarMensagem(m);

        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.textContent = 'Excluir';

        excluir.onclick = () => excluirMensagem(m);

        acoes.append(editar, excluir);
        tdAcoes.appendChild(acoes);
        linha.appendChild(tdAcoes);

        tbody.appendChild(linha);
    }

    tabela.append(thead, tbody);
    lista.appendChild(tabela);
}

/* ==========================================
   CARREGAR MENSAGENS E CUPONS
   ========================================== */

async function carregar() {
    const d = await req('/');

    if (!d) return;

    mensagens = d.mensagens || [];
    cupons = d.cupons || [];

    const selecionado = $('cupom').value;

    $('cupom').replaceChildren(
        new Option('Sem cupom', '')
    );

    for (const c of cupons) {
        const texto =
            c.codigo + (c.ativo ? '' : ' (inativo)');

        $('cupom').add(
            new Option(texto, c.id_cupom)
        );
    }

    $('cupom').value = selecionado;

    configurarEstiloTabela();
    montarTabela();
}

/* ==========================================
   ATUALIZAR PRÉ-VISUALIZAÇÃO
   ========================================== */

$('form').addEventListener('input', previa);
$('form').addEventListener('change', previa);

/* ==========================================
   NOVO CADASTRO
   ========================================== */

$('limpar').onclick = () => {
    editando = null;

    $('form').reset();

    previa();

    $('aviso').textContent = '';
};

/* ==========================================
   SALVAR MENSAGEM
   ========================================== */

$('form').onsubmit = async e => {
    e.preventDefault();

    try {
        const resultado = await req(
            editando ? '/' + editando : '/',
            {
                method: editando ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados())
            }
        );

        if (!resultado) return;

        editando = null;

        $('form').reset();

        $('aviso').textContent =
            'Mensagem salva com sucesso!';

        await carregar();
        previa();

    } catch (e) {
        $('aviso').textContent = e.message;
    }
};

/* ==========================================
   INICIALIZAÇÃO
   ========================================== */

carregar()
    .then(previa)
    .catch(e => {
        $('aviso').textContent = e.message;
    });
