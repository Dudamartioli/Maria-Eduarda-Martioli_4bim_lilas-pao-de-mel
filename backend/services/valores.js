// O frete por bairro será cadastrado no painel administrativo.
// Enquanto o CRUD de Fretes não existir, NÃO cobrar valor fixo arbitrário.
function frete(modalidade,cidade){if(modalidade==='retirada'||cidade==='Quarto Centenário')return 0;throw Error('Frete por bairro ainda não cadastrado. Não é possível gerar Pix de entrega nesta cidade.');}
module.exports={frete};
