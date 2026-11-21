// Modal compartilhado em todas as páginas da Lila's.
// Usa dialog nativo, como o aviso personalizado do carrinho.
(function () {
    "use strict";
    const fila = [];
    let aberto = false;
    function montar() {
        let dialog = document.getElementById("lilasAvisoGlobal");
        if (dialog) return dialog;
        dialog = document.createElement("dialog");
        dialog.id = "lilasAvisoGlobal";
        dialog.className = "lilas-aviso-dialog";
        dialog.innerHTML = '<div class="lilas-aviso-caixa"><div class="lilas-aviso-icone" aria-hidden="true">🐝</div><h2 class="lilas-aviso-titulo"></h2><p class="lilas-aviso-texto"></p><textarea class="lilas-aviso-entrada" rows="3" maxlength="500" aria-label="Resposta" hidden></textarea><div class="lilas-aviso-acoes"><button class="lilas-aviso-botao lilas-aviso-cancelar" type="button" data-cancelar>Cancelar</button><button class="lilas-aviso-botao" type="button" data-aceitar>Entendi</button></div></div>';
        document.body.appendChild(dialog);
        return dialog;
    }
    function proximo() {
        if (aberto || !fila.length) return;
        aberto = true;
        const item = fila.shift();
        const dialog = montar();
        const aceitar = dialog.querySelector('[data-aceitar]');
        const cancelar = dialog.querySelector('[data-cancelar]');
        const entrada = dialog.querySelector('.lilas-aviso-entrada');
        dialog.querySelector('.lilas-aviso-titulo').textContent = item.titulo;
        dialog.querySelector('.lilas-aviso-texto').textContent = item.texto;
        cancelar.hidden = !item.confirmacao && !item.pergunta;
        entrada.hidden = !item.pergunta;
        entrada.value = item.valorInicial || '';
        entrada.placeholder = item.placeholder || '';
        aceitar.textContent = item.pergunta ? 'Continuar' : item.confirmacao ? 'Confirmar' : 'Entendi';
        function finalizar(resultado) {
            dialog.removeEventListener('cancel', aoCancelar);
            aceitar.removeEventListener('click', aoAceitar);
            cancelar.removeEventListener('click', aoCancelarClick);
            if (dialog.open) dialog.close();
            aberto = false;
            item.resolver(resultado);
            proximo();
        }
        function aoAceitar() { finalizar(item.pergunta ? entrada.value : true); }
        function aoCancelarClick() { finalizar(false); }
        function aoCancelar(evento) { evento.preventDefault(); finalizar(false); }
        aceitar.addEventListener('click', aoAceitar);
        cancelar.addEventListener('click', aoCancelarClick);
        dialog.addEventListener('cancel', aoCancelar);
        dialog.showModal();
        aceitar.focus();
    }
    function solicitar(titulo, texto, confirmacao, pergunta = false, placeholder = "", valorInicial = "") {
        return new Promise(function (resolver) {
            fila.push({titulo:String(titulo), texto:String(texto), confirmacao, pergunta, placeholder, valorInicial, resolver});
            proximo();
        });
    }
    window.LilaAvisos = {
        alerta: function (texto, titulo) { return solicitar(titulo || "Aviso da Lila's", texto, false); },
        confirmar: function (texto, titulo) { return solicitar(titulo || "Confirmação da Lila's", texto, true); },
        perguntar: function (texto, titulo, placeholder, valorInicial) { return solicitar(titulo || "Informação da Lila's", texto, false, true, placeholder, valorInicial); }
    };
})();
