/**
 * Persistência do Diário de Emoções.
 * Os registos ficam apenas no LocalStorage deste dispositivo.
 * A chave e a estrutura não devem mudar: uma alteração apagaria
 * o diário de quem já usa a aplicação.
 */

const CHAVE = 'diario_emocoes_v1';

export const EMOCOES_POSITIVAS = Object.freeze([
  'Felicidade',
  'Interesse',
  'Empolgação',
  'Cuidado',
  'Afeição',
  'Amor',
  'Sentir-se amada',
  'Compaixão',
  'Gratidão',
  'Orgulho',
  'Confiança',
  'Contentamento',
]);

export const EMOCOES_DIFICEIS = Object.freeze([
  'Tristeza',
  'Mágoa',
  'Irritação',
  'Raiva',
  'Ressentimento',
  'Nojo',
  'Vergonha',
  'Culpa',
  'Inveja',
  'Ciúme',
  'Ansiedade',
  'Medo',
  'Arrependimento',
]);

const ORDEM = Object.freeze([...EMOCOES_POSITIVAS, ...EMOCOES_DIFICEIS]);
const EMOCOES_VALIDAS = new Set(ORDEM);
const POSITIVAS = new Set(EMOCOES_POSITIVAS);

const ERRO_ACESSO = 'Não foi possível aceder ao armazenamento deste dispositivo.';
const ERRO_LEITURA = 'Não foi possível ler os registos guardados. Nada foi alterado.';
const ERRO_ESTRUTURA = 'A estrutura do diário não é válida.';
const ERRO_DATA = 'Encontrámos uma data inválida.';
const ERRO_EMOCAO = 'Encontrámos uma emoção que não faz parte da lista suportada.';
const ERRO_CHEIO = 'Não foi possível guardar. O armazenamento do dispositivo pode estar cheio.';
const ERRO_GUARDAR = 'Não foi possível guardar o registo neste dispositivo.';

/**
 * Data local do dispositivo, em YYYY-MM-DD.
 * Não usamos toISOString(): essa conversão passa por UTC
 * e pode associar o registo ao dia anterior ou seguinte.
 */
export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function dataDeChave(chave) {
  const ano = Number(chave.slice(0, 4));
  const mes = Number(chave.slice(5, 7));
  const dia = Number(chave.slice(8, 10));
  return new Date(ano, mes - 1, dia);
}

export function categoriaEmocao(nome) {
  return POSITIVAS.has(nome) ? 'positiva' : 'dificil';
}

export function lerRegistos() {
  const leitura = lerTexto();
  if (!leitura.ok) {
    return leitura;
  }

  if (leitura.texto === null) {
    return { ok: true, dados: {} };
  }

  let parsed;
  try {
    parsed = JSON.parse(leitura.texto);
  } catch (erro) {
    return { ok: false, erro: ERRO_LEITURA };
  }

  const validacao = validarDados(parsed);
  if (!validacao.ok) {
    return { ok: false, erro: ERRO_LEITURA };
  }

  return { ok: true, dados: validacao.dados };
}

export function obterRegisto(dataISO) {
  const leitura = lerRegistos();
  if (!leitura.ok) {
    return leitura;
  }

  return {
    ok: true,
    registo: leitura.dados[dataISO] ? copiarRegisto(leitura.dados[dataISO]) : null,
  };
}

export function guardarRegisto(dataISO, emocoes, notas) {
  if (!dataValida(dataISO)) {
    return { ok: false, erro: 'Data inválida.' };
  }

  if (dataISO > dataLocalISO()) {
    return { ok: false, erro: 'Não é possível guardar um dia futuro.' };
  }

  if (typeof notas !== 'string') {
    return { ok: false, erro: ERRO_GUARDAR };
  }

  const emocoesValidas = validarListaEmocoes(emocoes);
  if (!emocoesValidas.ok) {
    return { ok: false, erro: ERRO_GUARDAR };
  }

  const leitura = lerRegistos();
  if (!leitura.ok) {
    return { ok: false, erro: leitura.erro };
  }

  const dados = leitura.dados;
  dados[dataISO] = {
    emocoes: ordenarEmocoes(emocoesValidas.emocoes),
    notas: notas.normalize('NFC'),
  };

  return escrever(dados);
}

export function exportarDados() {
  const leitura = lerRegistos();
  if (!leitura.ok) {
    return leitura;
  }

  return { ok: true, dados: leitura.dados };
}

/**
 * Confirma que o JSON tem a estrutura do diário.
 * Não escreve nada: um ficheiro inválido não chega a tocar nos dados.
 */
export function validarDados(dados) {
  if (!eObjeto(dados)) {
    return { ok: false, erro: ERRO_ESTRUTURA };
  }

  const limpo = {};

  for (const chave of Object.keys(dados)) {
    if (!dataValida(chave)) {
      return { ok: false, erro: ERRO_DATA };
    }

    const registo = dados[chave];
    if (!eObjeto(registo)) {
      return { ok: false, erro: ERRO_ESTRUTURA };
    }

    const campos = Object.keys(registo);
    if (campos.length !== 2 || !Object.prototype.hasOwnProperty.call(registo, 'emocoes') || !Object.prototype.hasOwnProperty.call(registo, 'notas')) {
      return { ok: false, erro: ERRO_ESTRUTURA };
    }

    if (typeof registo.notas !== 'string') {
      return { ok: false, erro: ERRO_ESTRUTURA };
    }

    const emocoesValidas = validarListaEmocoes(registo.emocoes);
    if (!emocoesValidas.ok) {
      return emocoesValidas;
    }

    limpo[chave] = {
      emocoes: ordenarEmocoes(emocoesValidas.emocoes),
      notas: registo.notas.normalize('NFC'),
    };
  }

  return { ok: true, dados: limpo };
}

/** Substitui o diário inteiro. Só deve ser chamada depois da confirmação. */
export function substituirRegistos(dados) {
  const validacao = validarDados(dados);
  if (!validacao.ok) {
    return validacao;
  }

  return escrever(validacao.dados);
}

function validarListaEmocoes(emocoes) {
  if (!Array.isArray(emocoes) || emocoes.length === 0) {
    return { ok: false, erro: ERRO_ESTRUTURA };
  }

  const vistas = new Set();
  const lista = [];

  for (const emocao of emocoes) {
    if (typeof emocao !== 'string') {
      return { ok: false, erro: ERRO_ESTRUTURA };
    }

    const nome = emocao.normalize('NFC').trim();
    if (!EMOCOES_VALIDAS.has(nome)) {
      return { ok: false, erro: ERRO_EMOCAO };
    }

    if (vistas.has(nome)) {
      return { ok: false, erro: ERRO_ESTRUTURA };
    }

    vistas.add(nome);
    lista.push(nome);
  }

  return { ok: true, emocoes: lista };
}

function ordenarEmocoes(emocoes) {
  const presentes = new Set(emocoes);
  return ORDEM.filter((nome) => presentes.has(nome));
}

function dataValida(chave) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chave)) {
    return false;
  }

  const ano = Number(chave.slice(0, 4));
  const mes = Number(chave.slice(5, 7));
  const dia = Number(chave.slice(8, 10));
  const data = new Date(ano, mes - 1, dia);

  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function eObjeto(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function copiarRegisto(registo) {
  return {
    emocoes: [...registo.emocoes],
    notas: registo.notas,
  };
}

function lerTexto() {
  try {
    return { ok: true, texto: localStorage.getItem(CHAVE) };
  } catch (erro) {
    return { ok: false, erro: ERRO_ACESSO };
  }
}

function escrever(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    return { ok: true };
  } catch (erro) {
    const cheio = erro && (erro.name === 'QuotaExceededError' || erro.name === 'NS_ERROR_DOM_QUOTA_REACHED' || erro.code === 22);
    return { ok: false, erro: cheio ? ERRO_CHEIO : ERRO_GUARDAR };
  }
}
