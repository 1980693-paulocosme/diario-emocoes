import {
  EMOCOES_DIFICEIS,
  EMOCOES_POSITIVAS,
  categoriaEmocao,
  dataDeChave,
  dataLocalISO,
  exportarDados,
  guardarRegisto,
  lerRegistos,
  substituirRegistos,
  validarDados,
} from './storage.js';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const LIMITE_FICHEIRO = 5 * 1024 * 1024;

const ui = {
  aviso: document.getElementById('aviso-armazenamento'),
  dataVisivel: document.getElementById('data-visivel'),
  bannerEdicao: document.getElementById('banner-edicao'),
  voltarHoje: document.getElementById('voltar-hoje'),
  pergunta: document.getElementById('pergunta'),
  chips: document.getElementById('chips'),
  notas: document.getElementById('notas'),
  mensagemGuardar: document.getElementById('mensagem-guardar'),
  guardar: document.getElementById('guardar'),
  mesAnterior: document.getElementById('mes-anterior'),
  mesSeguinte: document.getElementById('mes-seguinte'),
  tituloMes: document.getElementById('titulo-mes'),
  grelha: document.getElementById('grelha'),
  detalhe: document.getElementById('detalhe'),
  exportar: document.getElementById('exportar'),
  abrirPdf: document.getElementById('abrir-pdf'),
  importar: document.getElementById('importar'),
  ficheiro: document.getElementById('ficheiro-importar'),
  toast: document.getElementById('toast'),
  modal: document.getElementById('modal-importar'),
  cancelarImportacao: document.getElementById('cancelar-importacao'),
  confirmarImportacao: document.getElementById('confirmar-importacao'),
  modalPdf: document.getElementById('modal-pdf'),
  periodosPdf: document.getElementById('periodos-pdf'),
  periodoPersonalizado: document.getElementById('periodo-personalizado'),
  pdfInicio: document.getElementById('pdf-inicio'),
  pdfFim: document.getElementById('pdf-fim'),
  mensagemPdf: document.getElementById('mensagem-pdf'),
  gerarPdf: document.getElementById('gerar-pdf'),
  cancelarPdf: document.getElementById('cancelar-pdf'),
  separadores: document.querySelectorAll('.barra-nav button'),
  vistas: document.querySelectorAll('.vista'),
};

const hojeInicial = dataLocalISO();
const hojeData = new Date();

const estado = {
  vista: 'hoje',
  dataEdicao: hojeInicial,
  hojeConhecido: hojeInicial,
  mesVisivel: { ano: hojeData.getFullYear(), mes: hojeData.getMonth() },
  diaSelecionado: hojeInicial,
  importacaoPendente: null,
  aGuardar: false,
  aGerarPdf: false,
  temporizadorToast: 0,
};

let moduloPdf = null;
let pedidoPdf = null;

const chips = new Map();
let registoSW = null;
let jaTinhaControlador = Boolean(navigator.serviceWorker && navigator.serviceWorker.controller);

iniciar();

function iniciar() {
  criarChips(ui.chips, [...EMOCOES_POSITIVAS, ...EMOCOES_DIFICEIS]);
  ligarEventos();
  carregarFormulario(estado.dataEdicao);
  renderCalendario();
  observarTeclado();
  registarServiceWorker();
}

function ligarEventos() {
  ui.separadores.forEach((botao) => {
    botao.addEventListener('click', () => {
      abrirSeparador(botao.dataset.vista);
    });
  });

  ui.chips.addEventListener('click', alternarChip);
  ui.notas.addEventListener('input', () => ajustarAltura(ui.notas));
  ui.notas.addEventListener('focus', () => {
    window.setTimeout(() => {
      ui.notas.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
  });

  ui.guardar.addEventListener('click', aoGuardar);
  ui.voltarHoje.addEventListener('click', () => {
    estado.diaSelecionado = dataLocalISO();
    estado.mesVisivel = mesDe(estado.diaSelecionado);
    carregarFormulario(estado.diaSelecionado);
    window.scrollTo(0, 0);
  });

  ui.mesAnterior.addEventListener('click', () => mudarMes(-1));
  ui.mesSeguinte.addEventListener('click', () => mudarMes(1));
  ui.exportar.addEventListener('click', aoExportar);
  ui.abrirPdf.addEventListener('click', abrirModalPdf);
  ui.periodosPdf.addEventListener('change', aoMudarPeriodo);
  ui.gerarPdf.addEventListener('click', aoGerarPdf);
  ui.cancelarPdf.addEventListener('click', fecharModalPdf);
  ui.modalPdf.addEventListener('cancel', (evento) => {
    evento.preventDefault();
    fecharModalPdf();
  });
  ui.modalPdf.addEventListener('click', (evento) => {
    if (evento.target === ui.modalPdf) {
      fecharModalPdf();
    }
  });
  ui.modalPdf.addEventListener('close', () => {
    document.body.classList.remove('modal-aberto');
  });
  ui.importar.addEventListener('click', () => ui.ficheiro.click());
  ui.ficheiro.addEventListener('change', aoEscolherFicheiro);
  ui.cancelarImportacao.addEventListener('click', cancelarImportacao);
  ui.confirmarImportacao.addEventListener('click', confirmarImportacao);
  ui.modal.addEventListener('cancel', (evento) => {
    evento.preventDefault();
    cancelarImportacao();
  });
  ui.modal.addEventListener('click', (evento) => {
    if (evento.target === ui.modal) {
      cancelarImportacao();
    }
  });
  ui.modal.addEventListener('close', () => {
    document.body.classList.remove('modal-aberto');
    estado.importacaoPendente = null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    atualizarDiaSeMudou();
    if (registoSW) {
      registoSW.update().catch(() => {});
    }
  });
}

function abrirSeparador(nome) {
  if (nome === 'hoje') {
    const hoje = dataLocalISO();
    estado.dataEdicao = hoje;
    estado.hojeConhecido = hoje;
    carregarFormulario(hoje);
  }

  if (nome === 'calendario') {
    renderCalendario();
  }

  if (nome === 'definicoes') {
    prepararPdf();
  }

  mostrarVista(nome, true);
}

function mostrarVista(nome, focar) {
  estado.vista = nome;

  ui.vistas.forEach((vista) => {
    vista.hidden = vista.dataset.vista !== nome;
  });

  ui.separadores.forEach((botao) => {
    if (botao.dataset.vista === nome) {
      botao.setAttribute('aria-current', 'page');
    } else {
      botao.removeAttribute('aria-current');
    }
  });

  window.scrollTo(0, 0);

  if (nome === 'hoje') {
    ajustarAltura(ui.notas);
  }

  if (!focar) {
    return;
  }

  const titulo = document.querySelector(`#vista-${nome} h1`);
  if (titulo) {
    window.requestAnimationFrame(() => titulo.focus({ preventScroll: true }));
  }
}

function criarChips(destino, nomes) {
  const fragmento = document.createDocumentFragment();

  nomes.forEach((nome) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'chip';
    botao.dataset.emocao = nome;
    botao.dataset.categoria = categoriaEmocao(nome);
    botao.setAttribute('aria-pressed', 'false');
    botao.append(criarIconeSelecao(), criarTexto(nome));
    chips.set(nome, botao);
    fragmento.append(botao);
  });

  destino.append(fragmento);
}

function criarTexto(nome) {
  const texto = document.createElement('span');
  texto.textContent = nome;
  return texto;
}

function criarIconeSelecao() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('chip-check');
  const caminho = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  caminho.setAttribute('d', 'M3.2 8.3 6.3 11.2 12.8 4.6');
  caminho.setAttribute('fill', 'none');
  caminho.setAttribute('stroke', 'currentColor');
  caminho.setAttribute('stroke-width', '1.8');
  caminho.setAttribute('stroke-linecap', 'round');
  caminho.setAttribute('stroke-linejoin', 'round');
  svg.append(caminho);
  return svg;
}

function alternarChip(evento) {
  const botao = evento.target.closest('button[data-emocao]');
  if (!botao) {
    return;
  }

  const ativo = botao.getAttribute('aria-pressed') === 'true';
  botao.setAttribute('aria-pressed', ativo ? 'false' : 'true');
  limparMensagemGuardar();
}

function aplicarSelecao(nomes) {
  const escolhidas = new Set(nomes);
  chips.forEach((botao, nome) => {
    botao.setAttribute('aria-pressed', escolhidas.has(nome) ? 'true' : 'false');
  });
}

function emocoesSelecionadas() {
  const nomes = [];
  chips.forEach((botao, nome) => {
    if (botao.getAttribute('aria-pressed') === 'true') {
      nomes.push(nome);
    }
  });
  return nomes;
}

function carregarFormulario(chave) {
  estado.dataEdicao = chave;
  const dados = comDiario();
  const registo = dados ? dados[chave] || null : null;
  atualizarCabecalho(chave, registo);

  if (registo) {
    aplicarSelecao(registo.emocoes);
    ui.notas.value = registo.notas;
  } else {
    aplicarSelecao([]);
    ui.notas.value = '';
  }

  limparMensagemGuardar();
  ajustarAltura(ui.notas);
}

function atualizarCabecalho(chave, registo) {
  const eHoje = chave === dataLocalISO();
  ui.dataVisivel.textContent = formatarDataLonga(chave, !eHoje);
  ui.pergunta.textContent = eHoje ? 'Como te sentiste hoje?' : 'Como te sentiste neste dia?';
  ui.bannerEdicao.hidden = eHoje;
  ui.guardar.textContent = registo ? 'Guardar alterações' : 'Guardar o meu dia';
}

function aoGuardar() {
  if (estado.aGuardar) {
    return;
  }

  const emocoes = emocoesSelecionadas();
  if (emocoes.length === 0) {
    ui.mensagemGuardar.hidden = false;
    ui.mensagemGuardar.textContent = 'Seleciona pelo menos uma emoção.';
    return;
  }

  estado.aGuardar = true;
  limparMensagemGuardar();

  const resultado = guardarRegisto(estado.dataEdicao, emocoes, ui.notas.value);
  estado.aGuardar = false;

  if (!resultado.ok) {
    mostrarToast(resultado.erro, true);
    return;
  }

  ui.guardar.textContent = 'Guardar alterações';
  mostrarToast('Registo guardado com carinho ❤️');
  renderCalendario();
}

function renderCalendario() {
  const { ano, mes } = estado.mesVisivel;
  const titulo = `${capitalizar(MESES[mes])} de ${ano}`;
  ui.tituloMes.textContent = titulo;
  ui.grelha.setAttribute('aria-label', `Dias de ${MESES[mes]} de ${ano}`);

  const dados = comDiario();
  const diario = dados || {};
  const hoje = dataLocalISO();
  const primeiro = new Date(ano, mes, 1);
  const deslocamento = (primeiro.getDay() + 6) % 7;
  const inicio = new Date(ano, mes, 1 - deslocamento);
  const botoes = [];

  for (let indice = 0; indice < 42; indice += 1) {
    const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
    const chave = dataLocalISO(data);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'dia';
    botao.dataset.data = chave;

    if (data.getMonth() !== mes) {
      botao.classList.add('fora');
    }
    if (chave === hoje) {
      botao.classList.add('hoje');
    }
    if (chave === estado.diaSelecionado) {
      botao.classList.add('selecionado');
      botao.setAttribute('aria-pressed', 'true');
    } else {
      botao.setAttribute('aria-pressed', 'false');
    }

    const numero = document.createElement('span');
    numero.className = 'dia-numero';
    numero.textContent = String(data.getDate());

    const ponto = document.createElement('span');
    ponto.className = 'dia-ponto';
    const temRegisto = Boolean(diario[chave]);
    ponto.classList.toggle('visivel', temRegisto);

    let rotulo = `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
    if (chave === hoje) {
      rotulo += ', hoje';
    }
    if (temRegisto) {
      rotulo += ', com registo';
    }
    botao.setAttribute('aria-label', rotulo);
    botao.append(numero, ponto);
    botao.addEventListener('click', () => selecionarDia(chave));
    botoes.push(botao);
  }

  ui.grelha.replaceChildren(...botoes);
  renderDetalhe(diario, dados !== null);
}

function renderDetalhe(diario, leituraOk) {
  const chave = estado.diaSelecionado;
  ui.detalhe.replaceChildren();

  if (!leituraOk) {
    ui.detalhe.append(paragrafo('detalhe-vazio', 'Não foi possível ler os registos guardados.'));
    return;
  }

  const titulo = document.createElement('h2');
  titulo.textContent = formatarDataLonga(chave, true);
  ui.detalhe.append(titulo);

  const registo = diario[chave];
  const futuro = chave > dataLocalISO();

  if (!registo) {
    const mensagem = futuro
      ? 'Ainda não é possível registar um dia futuro.'
      : 'Ainda não existe um registo para este dia.';
    ui.detalhe.append(paragrafo('detalhe-vazio', mensagem));
    if (!futuro) {
      ui.detalhe.append(botaoAcao('Registar emoções', () => editarData(chave)));
    }
    return;
  }

  const lista = document.createElement('div');
  lista.className = 'chips';
  registo.emocoes.forEach((nome) => {
    const chip = document.createElement('span');
    chip.className = 'chip chip-leitura';
    chip.dataset.categoria = categoriaEmocao(nome);
    chip.textContent = nome;
    lista.append(chip);
  });
  ui.detalhe.append(lista);

  if (registo.notas.trim()) {
    ui.detalhe.append(paragrafo('pensamento', registo.notas));
  }

  if (!futuro) {
    ui.detalhe.append(botaoAcao('Editar registo', () => editarData(chave)));
  }
}

function paragrafo(classe, texto) {
  const elemento = document.createElement('p');
  elemento.className = classe;
  elemento.textContent = texto;
  return elemento;
}

function botaoAcao(texto, aoClicar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-secundario';
  botao.textContent = texto;
  botao.addEventListener('click', aoClicar);
  return botao;
}

function selecionarDia(chave) {
  estado.diaSelecionado = chave;
  renderCalendario();
}

function mudarMes(delta) {
  const data = new Date(estado.mesVisivel.ano, estado.mesVisivel.mes + delta, 1);
  estado.mesVisivel = { ano: data.getFullYear(), mes: data.getMonth() };
  renderCalendario();
}

function editarData(chave) {
  if (chave > dataLocalISO()) {
    return;
  }

  estado.diaSelecionado = chave;
  estado.mesVisivel = mesDe(chave);
  carregarFormulario(chave);
  mostrarVista('hoje', true);
}

function aoExportar() {
  const resultado = exportarDados();
  if (!resultado.ok) {
    mostrarToast(resultado.erro, true);
    return;
  }

  const json = JSON.stringify(resultado.dados, null, 2);
  const nome = `diario-emocoes-${dataLocalISO()}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  let ficheiro = blob;

  try {
    ficheiro = new File([blob], nome, { type: 'application/json' });
  } catch (erro) {
    ficheiro = blob;
  }

  partilharOuDescarregar(ficheiro, nome);
}

function prepararPdf() {
  if (moduloPdf || pedidoPdf) {
    return;
  }

  pedidoPdf = Promise.all([import('./pdf.js'), carregarJsPdf()])
    .then(([modulo]) => {
      moduloPdf = modulo;
      pedidoPdf = null;
    })
    .catch(() => {
      pedidoPdf = null;
    });
}

function carregarJsPdf() {
  if (globalThis.jspdf && typeof globalThis.jspdf.jsPDF === 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const url = new URL('./vendor/jspdf.umd.min.js', import.meta.url).href;
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      if (globalThis.jspdf && typeof globalThis.jspdf.jsPDF === 'function') {
        resolve();
      } else {
        reject(new Error('jspdf'));
      }
    };
    script.onerror = () => reject(new Error('jspdf'));
    document.head.append(script);
  });
}

function abrirModalPdf() {
  prepararPdf();
  const hoje = dataLocalISO();
  ui.pdfInicio.max = hoje;
  ui.pdfFim.max = hoje;
  ui.pdfInicio.value = adicionarDias(hoje, -29);
  ui.pdfFim.value = hoje;
  const trinta = ui.periodosPdf.querySelector('input[value="30"]');
  if (trinta) {
    trinta.checked = true;
  }
  ui.periodoPersonalizado.hidden = true;
  definirMensagemPdf('');

  try {
    ui.modalPdf.showModal();
    document.body.classList.add('modal-aberto');
  } catch (erro) {
    mostrarToast('Não foi possível abrir a escolha do período.', true);
  }
}

function aoMudarPeriodo(evento) {
  const opcao = evento.target && evento.target.value;
  ui.periodoPersonalizado.hidden = opcao !== 'personalizado';
  definirMensagemPdf('');
}

function fecharModalPdf() {
  if (ui.modalPdf.open) {
    ui.modalPdf.close();
  }
}

function definirMensagemPdf(mensagem) {
  ui.mensagemPdf.textContent = mensagem;
  ui.mensagemPdf.hidden = mensagem === '';
}

function aoGerarPdf() {
  if (estado.aGerarPdf) {
    return;
  }

  if (!moduloPdf) {
    prepararPdf();
    definirMensagemPdf('O relatório ainda está a preparar-se. Tenta novamente dentro de um instante.');
    return;
  }

  const escolhido = ui.periodosPdf.querySelector('input[name="periodo"]:checked');
  const periodo = moduloPdf.resolverPeriodo({
    opcao: escolhido ? escolhido.value : '',
    inicio: ui.pdfInicio.value,
    fim: ui.pdfFim.value,
    hoje: dataLocalISO(),
  });

  if (!periodo.ok) {
    definirMensagemPdf(periodo.erro);
    return;
  }

  const leitura = lerRegistos();
  if (!leitura.ok) {
    definirMensagemPdf(leitura.erro);
    return;
  }

  estado.aGerarPdf = true;
  let resultado;
  try {
    resultado = moduloPdf.gerarRelatorioPdf({
      registos: leitura.dados,
      inicio: periodo.inicio,
      fim: periodo.fim,
    });
  } catch (erro) {
    definirMensagemPdf('Não foi possível criar o relatório PDF.');
    return;
  } finally {
    estado.aGerarPdf = false;
  }

  if (!resultado.ok) {
    definirMensagemPdf(resultado.erro);
    return;
  }

  const nome = `diario-emocoes-${dataLocalISO()}.pdf`;
  const blob = new Blob([resultado.bytes], { type: 'application/pdf' });
  let ficheiro = blob;

  try {
    ficheiro = new File([blob], nome, { type: 'application/pdf' });
  } catch (erro) {
    ficheiro = blob;
  }

  fecharModalPdf();
  partilharOuDescarregar(ficheiro, nome, 'Relatório PDF exportado.');
}

function adicionarDias(chave, dias) {
  const data = dataDeChave(chave);
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

async function partilharOuDescarregar(ficheiro, nome, mensagem = 'Diário exportado.') {
  if (navigator.canShare && navigator.canShare({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro], title: 'Diário de Emoções' });
      return;
    } catch (erro) {
      if (erro && erro.name === 'AbortError') {
        return;
      }
    }
  }

  const url = URL.createObjectURL(ficheiro);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  mostrarToast(mensagem);
}

async function aoEscolherFicheiro() {
  const ficheiro = ui.ficheiro.files && ui.ficheiro.files[0];
  ui.ficheiro.value = '';
  if (!ficheiro) {
    return;
  }

  if (ficheiro.size > LIMITE_FICHEIRO) {
    mostrarToast('Não foi possível importar. O ficheiro é demasiado grande. Os registos atuais mantêm-se.', true);
    return;
  }

  let texto;
  try {
    texto = await ficheiro.text();
  } catch (erro) {
    mostrarToast('Não foi possível importar. O ficheiro não pôde ser lido. Os registos atuais mantêm-se.', true);
    return;
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch (erro) {
    mostrarToast('Não foi possível importar. O ficheiro não contém JSON válido. Os registos atuais mantêm-se.', true);
    return;
  }

  const validacao = validarDados(dados);
  if (!validacao.ok) {
    mostrarToast(`Não foi possível importar. ${validacao.erro} Os registos atuais mantêm-se.`, true);
    return;
  }

  estado.importacaoPendente = validacao.dados;

  try {
    ui.modal.showModal();
    document.body.classList.add('modal-aberto');
    ui.cancelarImportacao.focus();
  } catch (erro) {
    estado.importacaoPendente = null;
    mostrarToast('Não foi possível abrir a confirmação. A importação foi cancelada. Os registos atuais mantêm-se.', true);
  }
}

function cancelarImportacao() {
  estado.importacaoPendente = null;
  if (ui.modal.open) {
    ui.modal.close();
  }
}

function confirmarImportacao() {
  const dados = estado.importacaoPendente;
  estado.importacaoPendente = null;
  if (ui.modal.open) {
    ui.modal.close();
  }

  if (!dados) {
    return;
  }

  const resultado = substituirRegistos(dados);
  if (!resultado.ok) {
    mostrarToast(`${resultado.erro} Os registos atuais mantêm-se.`, true);
    return;
  }

  const hoje = dataLocalISO();
  estado.dataEdicao = hoje;
  estado.diaSelecionado = hoje;
  estado.mesVisivel = mesDe(hoje);
  carregarFormulario(hoje);
  renderCalendario();
  mostrarToast('Diário importado. Os registos deste dispositivo foram substituídos.');
}

function comDiario() {
  const leitura = lerRegistos();
  if (!leitura.ok) {
    mostrarAviso(leitura.erro);
    return null;
  }

  esconderAviso();
  return leitura.dados;
}

function formularioSujo() {
  const dados = lerRegistos();
  if (!dados.ok) {
    return true;
  }

  const guardado = dados.dados[estado.dataEdicao] || null;
  const emocoes = emocoesSelecionadas();
  const notas = ui.notas.value;

  if (!guardado) {
    return emocoes.length > 0 || notas !== '';
  }

  if (notas !== guardado.notas) {
    return true;
  }

  if (emocoes.length !== guardado.emocoes.length) {
    return true;
  }

  const guardadas = new Set(guardado.emocoes);
  return emocoes.some((nome) => !guardadas.has(nome));
}

function atualizarDiaSeMudou() {
  const hoje = dataLocalISO();
  if (hoje === estado.hojeConhecido) {
    return;
  }

  const estavaNoDiaCorrente = estado.dataEdicao === estado.hojeConhecido;
  estado.hojeConhecido = hoje;

  if (estavaNoDiaCorrente && formularioSujo()) {
    const leitura = lerRegistos();
    const registo = leitura.ok ? leitura.dados[estado.dataEdicao] || null : null;
    atualizarCabecalho(estado.dataEdicao, registo);
  } else if (estavaNoDiaCorrente) {
    estado.dataEdicao = hoje;
    estado.diaSelecionado = hoje;
    estado.mesVisivel = mesDe(hoje);
    carregarFormulario(hoje);
  }

  if (estado.vista === 'calendario') {
    renderCalendario();
  }
}

function observarTeclado() {
  const viewport = window.visualViewport;
  if (!viewport) {
    return;
  }

  const atualizar = () => {
    const sobreposicao = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    const aberto = sobreposicao > 140;
    document.body.classList.toggle('teclado-aberto', aberto);
    document.documentElement.style.setProperty('--teclado', `${sobreposicao}px`);
    if (aberto && document.activeElement === ui.notas) {
      ui.notas.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  viewport.addEventListener('resize', atualizar);
  viewport.addEventListener('scroll', atualizar);
}

function registarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!jaTinhaControlador) {
      jaTinhaControlador = true;
      return;
    }

    if (ui.modal.open || formularioSujo()) {
      return;
    }

    window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js')
    .then((registo) => {
      registoSW = registo;
    })
    .catch(() => {});
}

function mostrarToast(mensagem, erro) {
  window.clearTimeout(estado.temporizadorToast);
  ui.toast.textContent = mensagem;
  ui.toast.classList.add('visivel');
  ui.toast.setAttribute('aria-hidden', 'false');
  if (erro) {
    ui.toast.setAttribute('role', 'alert');
  } else {
    ui.toast.setAttribute('role', 'status');
  }
  estado.temporizadorToast = window.setTimeout(() => {
    ui.toast.classList.remove('visivel');
    ui.toast.setAttribute('aria-hidden', 'true');
  }, erro ? 5200 : 3200);
}

function mostrarAviso(mensagem) {
  ui.aviso.hidden = false;
  ui.aviso.textContent = mensagem;
}

function esconderAviso() {
  ui.aviso.hidden = true;
  ui.aviso.textContent = '';
}

function limparMensagemGuardar() {
  ui.mensagemGuardar.hidden = true;
  ui.mensagemGuardar.textContent = '';
}

function ajustarAltura(area) {
  area.style.height = 'auto';
  area.style.height = `${Math.max(area.scrollHeight, 120)}px`;
}

function formatarDataLonga(chave, comAno) {
  const data = dataDeChave(chave);
  const texto = `${capitalizar(DIAS_SEMANA[data.getDay()])}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
  return comAno ? `${texto} de ${data.getFullYear()}` : texto;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mesDe(chave) {
  const data = dataDeChave(chave);
  return { ano: data.getFullYear(), mes: data.getMonth() };
}
