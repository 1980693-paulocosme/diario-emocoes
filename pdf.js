/**
 * Relatório PDF do Diário de Emoções.
 *
 * O ficheiro é criado neste dispositivo, a partir dos registos
 * que já estão no LocalStorage. Não há pedidos de rede, analytics
 * nem cópia dos dados para o cache do Service Worker.
 *
 * A fonte é um subconjunto de Source Sans 3 (SIL Open Font License),
 * com o nome interno Diario Sans, para o português aparecer corretamente.
 * A licença está em vendor/OFL.txt. O gerador é jsPDF (MIT),
 * em vendor/jspdf.umd.min.js, carregado antes de criar o documento.
 */

import { fonteBold } from './vendor/diario-sans-bold.js';
import { fonteRegular } from './vendor/diario-sans-regular.js';
import {
  EMOCOES_DIFICEIS,
  EMOCOES_POSITIVAS,
  dataDeChave,
  dataLocalISO,
} from './storage.js';

const ORDEM = Object.freeze([...EMOCOES_POSITIVAS, ...EMOCOES_DIFICEIS]);
const ORDEM_INDICE = new Map(ORDEM.map((nome, indice) => [nome, indice]));

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MENSAGEM_VAZIO = 'Não existem registos para o período selecionado.';

const MARGEM = 14;
const TOPO = 16;
const LIMITE = 276;
const LARGURA = 210 - MARGEM * 2;
const ALTURA_RESUMO = 7.2;
const COL_NOME = 56;
const COL_DIA = (LARGURA - COL_NOME) / 7;
const ALTURA_CABECALHO = 11;
const ALTURA_GRUPO = 6.6;
const ALTURA_EMOCAO = 5.8;

const TINTA = [44, 40, 37];
const TINTA_SUAVE = [92, 85, 78];
const SALVIA = [44, 94, 73];
const SALVIA_SUAVE = [227, 240, 228];
const SALVIA_TINTA = [20, 61, 40];
const LINHA = [228, 220, 210];
const FUNDO_LINHA = [247, 244, 239];
const FUNDO_GRUPO = [239, 232, 220];
const DIA_FORA = [163, 154, 146];

const CARACTERES_FORA = /[^\n\u0020-\u007E\u00A0-\u00FF\u2010-\u2015\u2018-\u201E\u2022\u2026\u20AC]/g;

export function adicionarDias(chave, dias) {
  const data = dataDeChave(chave);
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

export function resolverPeriodo({ opcao, inicio, fim, hoje }) {
  if (opcao === '7') {
    return { ok: true, inicio: adicionarDias(hoje, -6), fim: hoje };
  }

  if (opcao === '30') {
    return { ok: true, inicio: adicionarDias(hoje, -29), fim: hoje };
  }

  if (opcao === 'tudo') {
    return { ok: true, inicio: null, fim: hoje };
  }

  if (opcao !== 'personalizado') {
    return { ok: false, erro: 'Escolhe o período do relatório.' };
  }

  if (!dataValida(inicio) || !dataValida(fim)) {
    return { ok: false, erro: 'Escolhe a data inicial e a data final.' };
  }

  if (inicio > hoje || fim > hoje) {
    return { ok: false, erro: 'Não é possível incluir datas futuras.' };
  }

  if (inicio > fim) {
    return { ok: false, erro: 'A data inicial não pode ser posterior à data final.' };
  }

  return { ok: true, inicio, fim };
}

/**
 * Organiza os registos do período. Não escreve no armazenamento
 * e não cria dias que não existam.
 */
export function prepararRelatorio({ registos, inicio, fim }) {
  const hoje = dataLocalISO();
  const fimEfetivo = fim && fim < hoje ? fim : hoje;
  const dias = [];

  if (registos && typeof registos === 'object') {
    for (const chave of Object.keys(registos)) {
      if (!dataValida(chave) || chave > fimEfetivo) {
        continue;
      }
      if (inicio && chave < inicio) {
        continue;
      }

      const registo = registos[chave];
      if (!registo || typeof registo !== 'object') {
        continue;
      }

      const presentes = new Set(Array.isArray(registo.emocoes) ? registo.emocoes : []);
      const emocoes = ORDEM.filter((nome) => presentes.has(nome));
      if (emocoes.length === 0) {
        continue;
      }

      dias.push({
        chave,
        emocoes,
        notas: typeof registo.notas === 'string' ? registo.notas : '',
      });
    }
  }

  dias.sort((a, b) => (a.chave < b.chave ? -1 : 1));

  if (dias.length === 0) {
    return { ok: false, erro: MENSAGEM_VAZIO };
  }

  const contagem = ORDEM.map((emocao, ordem) => ({
    emocao,
    ordem,
    dias: dias.reduce((total, dia) => total + (dia.emocoes.includes(emocao) ? 1 : 0), 0),
  }))
    .filter((linha) => linha.dias > 0)
    .sort((a, b) => b.dias - a.dias || a.ordem - b.ordem);

  return {
    ok: true,
    inicio: inicio || dias[0].chave,
    fim: fimEfetivo,
    dias,
    contagem,
    semanas: semanasComRegistos(dias),
  };
}

export function gerarRelatorioPdf({ registos, inicio, fim }) {
  const relatorio = prepararRelatorio({ registos, inicio, fim });
  if (!relatorio.ok) {
    return relatorio;
  }

  const doc = criarDocumento();
  const ctx = { doc, y: 22 };

  desenharCapa(ctx, relatorio);
  desenharContagem(ctx, relatorio.contagem);
  desenharMapa(ctx, relatorio);
  desenharRegistos(ctx, relatorio.dias);
  desenharRodapes(doc);

  const buffer = doc.output('arraybuffer');
  return {
    ok: true,
    bytes: new Uint8Array(buffer),
    paginas: doc.getNumberOfPages(),
  };
}

function criarDocumento() {
  const api = globalThis.jspdf;
  if (!api || typeof api.jsPDF !== 'function') {
    throw new Error('O gerador de PDF não está disponível.');
  }

  const doc = new api.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('DiarioSans-Regular.ttf', fonteRegular);
  doc.addFont('DiarioSans-Regular.ttf', 'DiarioSans', 'normal');
  doc.addFileToVFS('DiarioSans-Bold.ttf', fonteBold);
  doc.addFont('DiarioSans-Bold.ttf', 'DiarioSans', 'bold');
  doc.setFont('DiarioSans', 'normal');
  doc.setProperties({
    title: 'Diário de Emoções — Relatório de acompanhamento emocional',
    creator: 'Diário de Emoções',
  });
  return doc;
}

function desenharCapa(ctx, relatorio) {
  const doc = ctx.doc;
  definirFonte(doc, 'bold', 20, TINTA);
  doc.text('Diário de Emoções', MARGEM, ctx.y);
  ctx.y += 8;

  definirFonte(doc, 'normal', 11, TINTA_SUAVE);
  doc.text('Relatório de acompanhamento emocional', MARGEM, ctx.y);
  ctx.y += 3;
  traco(doc, SALVIA);
  doc.setLineWidth(0.5);
  doc.line(MARGEM, ctx.y, MARGEM + 42, ctx.y);
  ctx.y += 9;

  definirFonte(doc, 'bold', 9, TINTA_SUAVE);
  doc.text('Período analisado', MARGEM, ctx.y);
  ctx.y += 5.5;
  definirFonte(doc, 'normal', 12, TINTA);
  doc.text(`${formatarDataCurta(relatorio.inicio)} a ${formatarDataCurta(relatorio.fim)}`, MARGEM, ctx.y);
  ctx.y += 7;

  definirFonte(doc, 'normal', 11, TINTA);
  doc.text(`Número de dias com registos: ${relatorio.dias.length}`, MARGEM, ctx.y);
  ctx.y += 6;

  definirFonte(doc, 'normal', 9, TINTA_SUAVE);
  doc.text(`Gerado em ${formatarDataCurta(dataLocalISO())}`, MARGEM, ctx.y);
  ctx.y += 10;
}

function desenharContagem(ctx, contagem) {
  definirFonte(ctx.doc, 'bold', 13, SALVIA);
  garantir(ctx, 8);
  ctx.doc.text('Emoções registadas', MARGEM, ctx.y);
  ctx.y += 4;

  desenharCabecalhoContagem(ctx);

  contagem.forEach((linha, indice) => {
    if (ctx.y + ALTURA_RESUMO > LIMITE) {
      novaPagina(ctx);
      desenharCabecalhoContagem(ctx);
    }

    if (indice % 2 === 1) {
      preencher(ctx.doc, FUNDO_LINHA);
      ctx.doc.rect(MARGEM, ctx.y, LARGURA, ALTURA_RESUMO, 'F');
    }

    traco(ctx.doc, LINHA);
    ctx.doc.setLineWidth(0.15);
    ctx.doc.line(MARGEM, ctx.y + ALTURA_RESUMO, MARGEM + LARGURA, ctx.y + ALTURA_RESUMO);

    definirFonte(ctx.doc, 'normal', 10, TINTA);
    const base = ctx.y + 4.8;
    ctx.doc.text(linha.emocao, MARGEM + 2, base);
    ctx.doc.text(String(linha.dias), MARGEM + LARGURA - 2, base, { align: 'right' });
    ctx.y += ALTURA_RESUMO;
  });

  ctx.y += 8;
}

function desenharCabecalhoContagem(ctx) {
  garantir(ctx, ALTURA_RESUMO);
  preencher(ctx.doc, SALVIA_SUAVE);
  ctx.doc.rect(MARGEM, ctx.y, LARGURA, ALTURA_RESUMO, 'F');
  definirFonte(ctx.doc, 'bold', 9, SALVIA_TINTA);
  const base = ctx.y + 4.8;
  ctx.doc.text('Emoção', MARGEM + 2, base);
  ctx.doc.text('Número de dias', MARGEM + LARGURA - 2, base, { align: 'right' });
  ctx.y += ALTURA_RESUMO;
}

function desenharMapa(ctx, relatorio) {
  const porDia = new Map(relatorio.dias.map((dia) => [dia.chave, new Set(dia.emocoes)]));
  let tituloDesenhado = false;

  for (const semana of relatorio.semanas) {
    const altura = alturaTabelaSemanal();
    const titulo = tituloDesenhado ? 0 : 12;
    const folga = tituloDesenhado ? 8 : 0;

    if (ctx.y + titulo + folga + altura > LIMITE) {
      novaPagina(ctx);
    }

    if (!tituloDesenhado) {
      tituloSecao(ctx, 'Mapa semanal de emoções');
      tituloDesenhado = true;
    } else if (ctx.y > TOPO + 1) {
      ctx.y += 8;
    }

    desenharSemana(ctx, semana, porDia, relatorio.inicio, relatorio.fim);
  }
}

function desenharSemana(ctx, semana, porDia, inicio, fim) {
  const doc = ctx.doc;
  definirFonte(doc, 'bold', 11, TINTA);
  doc.text(formatarIntervaloSemana(semana.inicio, semana.fim), MARGEM, ctx.y);
  ctx.y += 3.5;

  const topo = ctx.y;
  desenharCabecalhoSemana(ctx, semana, inicio, fim);

  desenharGrupo(ctx, 'Emoções positivas');
  for (const emocao of EMOCOES_POSITIVAS) {
    desenharLinhaEmocao(ctx, emocao, semana, porDia);
  }

  desenharGrupo(ctx, 'Emoções difíceis');
  for (const emocao of EMOCOES_DIFICEIS) {
    desenharLinhaEmocao(ctx, emocao, semana, porDia);
  }

  traco(doc, LINHA);
  doc.setLineWidth(0.25);
  doc.rect(MARGEM, topo, LARGURA, ctx.y - topo);
  doc.line(MARGEM + COL_NOME, topo, MARGEM + COL_NOME, ctx.y);
  for (let i = 1; i < 7; i += 1) {
    const x = MARGEM + COL_NOME + i * COL_DIA;
    doc.line(x, topo, x, ctx.y);
  }

  ctx.y += 2;
}

function desenharCabecalhoSemana(ctx, semana, inicio, fim) {
  const doc = ctx.doc;
  preencher(doc, SALVIA_SUAVE);
  doc.rect(MARGEM, ctx.y, LARGURA, ALTURA_CABECALHO, 'F');
  definirFonte(doc, 'bold', 8, SALVIA_TINTA);
  doc.text('Emoção', MARGEM + 2, ctx.y + 6.6);

  for (let i = 0; i < 7; i += 1) {
    const chave = semana.dias[i];
    const dentro = chave >= inicio && chave <= fim;
    const x = MARGEM + COL_NOME + i * COL_DIA + COL_DIA / 2;
    definirFonte(doc, 'bold', 7.5, dentro ? SALVIA_TINTA : DIA_FORA);
    doc.text(DIAS_CURTOS[i], x, ctx.y + 4.4, { align: 'center' });
    definirFonte(doc, 'normal', 7.5, dentro ? SALVIA_TINTA : DIA_FORA);
    doc.text(String(dataDeChave(chave).getDate()), x, ctx.y + 8.4, { align: 'center' });
  }

  ctx.y += ALTURA_CABECALHO;
}

function desenharGrupo(ctx, titulo) {
  preencher(ctx.doc, FUNDO_GRUPO);
  ctx.doc.rect(MARGEM, ctx.y, LARGURA, ALTURA_GRUPO, 'F');
  definirFonte(ctx.doc, 'bold', 8, TINTA);
  ctx.doc.text(titulo, MARGEM + 2, ctx.y + 4.4);
  ctx.y += ALTURA_GRUPO;
}

function desenharLinhaEmocao(ctx, emocao, semana, porDia) {
  const indice = ORDEM_INDICE.get(emocao) ?? 0;
  if (indice % 2 === 1) {
    preencher(ctx.doc, FUNDO_LINHA);
    ctx.doc.rect(MARGEM, ctx.y, LARGURA, ALTURA_EMOCAO, 'F');
  }

  definirFonte(ctx.doc, 'normal', 8, TINTA);
  ctx.doc.text(emocao, MARGEM + 2, ctx.y + 4);

  for (let i = 0; i < 7; i += 1) {
    const chave = semana.dias[i];
    const marcas = porDia.get(chave);
    if (!marcas || !marcas.has(emocao)) {
      continue;
    }
    const cx = MARGEM + COL_NOME + i * COL_DIA + COL_DIA / 2;
    const cy = ctx.y + ALTURA_EMOCAO / 2;
    preencher(ctx.doc, SALVIA);
    ctx.doc.circle(cx, cy, 1.15, 'F');
  }

  ctx.y += ALTURA_EMOCAO;
}

function desenharRegistos(ctx, dias) {
  if (ctx.y > TOPO + 4) {
    ctx.y += 10;
  }
  if (ctx.y + 32 > LIMITE) {
    novaPagina(ctx);
  }
  tituloSecao(ctx, 'Registos diários');

  dias.forEach((dia, indice) => {
    desenharDia(ctx, dia, indice > 0);
  });
}

function desenharDia(ctx, dia, separar) {
  const doc = ctx.doc;
  definirFonte(doc, 'normal', 10.5, TINTA);
  const linhasEmocoes = doc.splitTextToSize(dia.emocoes.join(', '), LARGURA);
  const separador = separar && ctx.y > TOPO + 8 ? 5 : 0;
  const altura = separador + 6.2 + 4.6 + linhasEmocoes.length * 4.8 + 3;

  if (ctx.y + altura > LIMITE) {
    novaPagina(ctx);
  } else if (separador > 0) {
    traco(doc, LINHA);
    doc.setLineWidth(0.25);
    doc.line(MARGEM, ctx.y, MARGEM + LARGURA, ctx.y);
    ctx.y += 5;
  }

  definirFonte(doc, 'bold', 12, TINTA);
  const dataLonga = formatarDataLonga(dia.chave);
  const linhasData = doc.splitTextToSize(dataLonga, LARGURA);
  for (const linha of linhasData) {
    doc.text(linha, MARGEM, ctx.y);
    ctx.y += 5.4;
  }
  ctx.y += 1.2;

  definirFonte(doc, 'bold', 9, TINTA_SUAVE);
  doc.text('Emoções', MARGEM, ctx.y);
  ctx.y += 4.6;

  definirFonte(doc, 'normal', 10.5, TINTA);
  for (const linha of linhasEmocoes) {
    doc.text(linha, MARGEM, ctx.y);
    ctx.y += 4.8;
  }

  const notas = textoSeguro(dia.notas);
  if (notas.trim() !== '') {
    ctx.y += 1.6;
    escreverNotas(ctx, dia.chave, notas);
  }

  ctx.y += 4;
}

function escreverNotas(ctx, chave, notas) {
  if (ctx.y + 10 > LIMITE) {
    novaPagina(ctx);
    marcarContinuacao(ctx, chave);
  }

  definirFonte(ctx.doc, 'bold', 9, TINTA_SUAVE);
  ctx.doc.text('Notas', MARGEM, ctx.y);
  ctx.y += 4.8;

  for (const paragrafo of notas.split('\n')) {
    if (paragrafo.trim() === '') {
      if (ctx.y + 3.4 > LIMITE) {
        novaPagina(ctx);
        marcarContinuacao(ctx, chave);
      }
      ctx.y += 3.4;
      continue;
    }

    definirFonte(ctx.doc, 'normal', 10.5, TINTA);
    const linhas = ctx.doc.splitTextToSize(paragrafo, LARGURA);
    for (const linha of linhas) {
      if (ctx.y + 4.8 > LIMITE) {
        novaPagina(ctx);
        marcarContinuacao(ctx, chave);
        definirFonte(ctx.doc, 'normal', 10.5, TINTA);
      }
      ctx.doc.text(linha, MARGEM, ctx.y);
      ctx.y += 4.8;
    }
  }
}

function marcarContinuacao(ctx, chave) {
  definirFonte(ctx.doc, 'normal', 9, TINTA_SUAVE);
  ctx.doc.text(`${formatarDataCurta(chave)} (continuação)`, MARGEM, ctx.y);
  ctx.y += 6;
}

function tituloSecao(ctx, titulo) {
  definirFonte(ctx.doc, 'bold', 13, SALVIA);
  ctx.doc.text(titulo, MARGEM, ctx.y);
  ctx.y += 1.8;
  traco(ctx.doc, SALVIA);
  ctx.doc.setLineWidth(0.45);
  ctx.doc.line(MARGEM, ctx.y, MARGEM + 34, ctx.y);
  ctx.y += 6;
}

function desenharRodapes(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    definirFonte(doc, 'normal', 8, TINTA_SUAVE);
    doc.text('Diário de Emoções', MARGEM, 288);
    doc.text(`${i} / ${total}`, 210 - MARGEM, 288, { align: 'right' });
  }
}

function alturaTabelaSemanal() {
  return 6.5 + ALTURA_CABECALHO + ALTURA_GRUPO * 2 + ALTURA_EMOCAO * ORDEM.length;
}

function semanasComRegistos(dias) {
  const semanas = [];
  let cursor = inicioDaSemana(dias[0].chave);
  const ultima = inicioDaSemana(dias[dias.length - 1].chave);
  let guarda = 0;

  while (cursor <= ultima && guarda < 800) {
    const fim = adicionarDias(cursor, 6);
    const temRegisto = dias.some((dia) => dia.chave >= cursor && dia.chave <= fim);
    if (temRegisto) {
      const colunas = [];
      for (let i = 0; i < 7; i += 1) {
        colunas.push(adicionarDias(cursor, i));
      }
      semanas.push({ inicio: cursor, fim, dias: colunas });
    }
    cursor = adicionarDias(cursor, 7);
    guarda += 1;
  }

  return semanas;
}

function inicioDaSemana(chave) {
  const data = dataDeChave(chave);
  const deslocamento = (data.getDay() + 6) % 7;
  data.setDate(data.getDate() - deslocamento);
  return dataLocalISO(data);
}

function novaPagina(ctx) {
  ctx.doc.addPage();
  ctx.y = TOPO;
}

function garantir(ctx, altura) {
  if (ctx.y + altura > LIMITE) {
    novaPagina(ctx);
  }
}

function definirFonte(doc, estilo, tamanho, cor) {
  doc.setFont('DiarioSans', estilo);
  doc.setFontSize(tamanho);
  doc.setTextColor(cor[0], cor[1], cor[2]);
}

function preencher(doc, cor) {
  doc.setFillColor(cor[0], cor[1], cor[2]);
}

function traco(doc, cor) {
  doc.setDrawColor(cor[0], cor[1], cor[2]);
}

function textoSeguro(valor) {
  return String(valor)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ')
    .normalize('NFC')
    .replace(CARACTERES_FORA, ' ');
}

function formatarDataCurta(chave) {
  const [ano, mes, dia] = chave.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataLonga(chave) {
  const data = dataDeChave(chave);
  const semana = DIAS_SEMANA[data.getDay()];
  const nome = semana.charAt(0).toUpperCase() + semana.slice(1);
  return `${nome}, ${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

function formatarIntervaloSemana(inicio, fim) {
  const di = dataDeChave(inicio);
  const df = dataDeChave(fim);
  if (di.getFullYear() === df.getFullYear() && di.getMonth() === df.getMonth()) {
    return `Semana de ${di.getDate()} a ${df.getDate()} de ${MESES[df.getMonth()]} de ${df.getFullYear()}`;
  }
  if (di.getFullYear() === df.getFullYear()) {
    return `Semana de ${di.getDate()} de ${MESES[di.getMonth()]} a ${df.getDate()} de ${MESES[df.getMonth()]} de ${df.getFullYear()}`;
  }
  return `Semana de ${di.getDate()} de ${MESES[di.getMonth()]} de ${di.getFullYear()} a ${df.getDate()} de ${MESES[df.getMonth()]} de ${df.getFullYear()}`;
}

function dataValida(chave) {
  if (typeof chave !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(chave)) {
    return false;
  }
  return dataLocalISO(dataDeChave(chave)) === chave;
}
