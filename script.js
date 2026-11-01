/* ============================================================
   Câmbio & Bolsa
   - Moedas: AwesomeAPI (sem chave)
   - Ações:  brapi.dev (PETR4, VALE3, MGLU3 e ITUB4 funcionam sem token)
   ============================================================ */

// Opcional: token fixo no código. O mais prático é colar o token no próprio site
// (campo "Tenho um token da brapi.dev"), que guarda só no seu navegador.
const BRAPI_TOKEN = "";

const MOEDAS = {
  BRL: "Real brasileiro",
  USD: "Dólar americano",
  EUR: "Euro",
  GBP: "Libra esterlina",
  JPY: "Iene japonês",
  ARS: "Peso argentino",
  CAD: "Dólar canadense",
  CHF: "Franco suíço",
  BTC: "Bitcoin",
};

const ACOES_PADRAO = ["PETR4", "VALE3", "ITUB4", "MGLU3"];

// "Taxas" = quanto vale 1 unidade de cada moeda em reais.
let taxas = { BRL: 1 };
let variacoes = {};

/* ---------- Utilidades ---------- */

const $ = (id) => document.getElementById(id);

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarMoeda(valor, codigo) {
  const casas = codigo === "BTC" ? 8 : 2;
  const numero = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: casas,
  }).format(valor);
  return `${numero} ${codigo}`;
}

function classeVariacao(v) {
  return v >= 0 ? "alta" : "baixa";
}

function formatarPercentual(v) {
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toFixed(2).replace(".", ",")}%`;
}

function formatarReais(v) {
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${fmtBRL.format(Math.abs(v))}`;
}

async function buscarJSON(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) {
    const erro = new Error(`HTTP ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return resposta.json();
}

/* ---------- Token ---------- */

function obterToken() {
  try {
    return localStorage.getItem("brapi_token") || BRAPI_TOKEN;
  } catch (e) {
    return BRAPI_TOKEN;
  }
}

function opcoesRequisicao() {
  const token = obterToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

function salvarToken() {
  const valor = $("token").value.trim();
  try {
    if (valor) localStorage.setItem("brapi_token", valor);
    else localStorage.removeItem("brapi_token");
  } catch (e) { /* ignora */ }

  $("token").value = "";
  $("token-status").textContent = valor
    ? "Token salvo neste navegador."
    : "Token removido. Voltando ao modo sem token.";

  carregarAcoes();
  if (acaoSelecionada) carregarHistorico(acaoSelecionada);
}

function textoSemToken(falhas) {
  const lista = falhas.length ? ` Falhou: ${falhas.join(", ")}.` : "";
  return obterToken()
    ? `Não foi possível carregar.${lista}`
    : `Sem token, só PETR4, VALE3, ITUB4 e MGLU3 estão disponíveis.${lista} Para outras ações, cole um token gratuito da brapi.dev em "Tenho um token".`;
}

/* ---------- MOEDAS ---------- */

async function carregarMoedas() {
  const codigos = Object.keys(MOEDAS).filter((c) => c !== "BRL");
  const pares = codigos.map((c) => `${c}-BRL`).join(",");

  $("moedas-atualizado").textContent = "Atualizando...";

  try {
    const dados = await buscarJSON(`https://economia.awesomeapi.com.br/json/last/${pares}`);

    taxas = { BRL: 1 };
    variacoes = {};

    for (const codigo of codigos) {
      const item = dados[`${codigo}BRL`];
      if (!item) continue;
      taxas[codigo] = parseFloat(item.bid);
      variacoes[codigo] = parseFloat(item.pctChange);
    }

    desenharGradeMoedas();
    converter();
    $("moedas-atualizado").textContent =
      "Atualizado às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch (erro) {
    console.error(erro);
    $("moedas-atualizado").textContent = "Não foi possível carregar as cotações. Tente atualizar.";
    $("resultado-detalhe").textContent = "Sem conexão com a API de câmbio.";
  }
}

function desenharGradeMoedas() {
  const grade = $("grade-moedas");
  grade.replaceChildren();

  for (const codigo of Object.keys(MOEDAS)) {
    if (codigo === "BRL" || !(codigo in taxas)) continue;

    const caixa = document.createElement("div");
    caixa.className = "moeda";

    const cod = document.createElement("div");
    cod.className = "cod";
    cod.textContent = `${codigo} · ${MOEDAS[codigo]}`;

    const preco = document.createElement("div");
    preco.className = "preco";
    preco.textContent = fmtBRL.format(taxas[codigo]);

    const variacao = document.createElement("div");
    const v = variacoes[codigo] ?? 0;
    variacao.className = classeVariacao(v);
    variacao.textContent = formatarPercentual(v);

    caixa.append(cod, preco, variacao);
    grade.appendChild(caixa);
  }
}

function preencherSelects() {
  for (const id of ["de", "para"]) {
    const select = $(id);
    for (const [codigo, nome] of Object.entries(MOEDAS)) {
      const opcao = document.createElement("option");
      opcao.value = codigo;
      opcao.textContent = `${codigo} — ${nome}`;
      select.appendChild(opcao);
    }
  }
  $("de").value = "USD";
  $("para").value = "BRL";
}

function converter() {
  const valor = parseFloat($("valor").value);
  const de = $("de").value;
  const para = $("para").value;

  if (!(de in taxas) || !(para in taxas)) return;

  if (isNaN(valor) || valor < 0) {
    $("resultado-valor").textContent = "—";
    $("resultado-detalhe").textContent = "Digite um valor válido.";
    return;
  }

  // Usa o real como moeda pivô: A -> BRL -> B
  const taxa = taxas[de] / taxas[para];
  const resultado = valor * taxa;

  $("resultado-valor").textContent = formatarMoeda(resultado, para);
  $("resultado-detalhe").textContent = `1 ${de} = ${formatarMoeda(taxa, para)}`;
}

/* ---------- BOLSA: cotações ---------- */

let carteira = carregarCarteira();
let cotacoes = {};
let acaoSelecionada = null;

function carregarCarteira() {
  try {
    const salva = JSON.parse(localStorage.getItem("carteira"));
    if (Array.isArray(salva) && salva.length) return salva;
  } catch (e) { /* ignora */ }
  return [...ACOES_PADRAO];
}

function salvarCarteira() {
  try {
    localStorage.setItem("carteira", JSON.stringify(carteira));
  } catch (e) { /* ignora */ }
}

// Normaliza a resposta, que pode vir em formatos diferentes entre versões da API.
function normalizarCotacao(item) {
  const d = item.data ?? item;
  return {
    simbolo: item.symbol ?? d.symbol,
    nome: d.shortName ?? d.longName ?? "",
    preco: d.regularMarketPrice,
    variacao: d.regularMarketChangePercent,
  };
}

async function buscarCotacao(ticker) {
  const opcoes = opcoesRequisicao();
  const simbolo = encodeURIComponent(ticker);

  let dados;
  try {
    dados = await buscarJSON(`https://brapi.dev/api/v2/stocks/quote?symbols=${simbolo}`, opcoes);
  } catch (erro) {
    if ([401, 402, 403, 404].includes(erro.status)) throw erro;
    // Plano B: endpoint anterior da API
    dados = await buscarJSON(`https://brapi.dev/api/quote/${simbolo}`, opcoes);
  }

  const item = dados.results?.[0];
  if (!item) throw new Error("Ação não encontrada");
  return normalizarCotacao(item);
}

async function carregarAcoes() {
  $("acoes-aviso").textContent = "Atualizando...";
  const falhas = [];

  // Uma requisição por ação, para funcionar também no plano gratuito.
  await Promise.all(
    carteira.map(async (ticker) => {
      try {
        cotacoes[ticker] = await buscarCotacao(ticker);
      } catch (erro) {
        console.error(ticker, erro);
        falhas.push(ticker);
        delete cotacoes[ticker];
      }
    })
  );

  desenharTabela();

  $("acoes-aviso").textContent = falhas.length
    ? textoSemToken(falhas)
    : "Atualizado às " +
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
      ". Os preços podem ter atraso.";
}

function desenharTabela() {
  const corpo = $("tabela-acoes");
  corpo.replaceChildren();

  for (const ticker of carteira) {
    const c = cotacoes[ticker];
    const linha = document.createElement("tr");
    if (ticker === acaoSelecionada) linha.className = "selecionada";

    const tdAtivo = document.createElement("td");
    tdAtivo.textContent = ticker;
    if (c?.nome) {
      const nome = document.createElement("span");
      nome.className = "nome";
      nome.textContent = c.nome;
      tdAtivo.appendChild(nome);
    }

    const tdPreco = document.createElement("td");
    tdPreco.textContent = c ? fmtBRL.format(c.preco) : "—";

    const tdVar = document.createElement("td");
    if (c && typeof c.variacao === "number") {
      tdVar.className = classeVariacao(c.variacao);
      tdVar.textContent = formatarPercentual(c.variacao);
    } else {
      tdVar.textContent = "—";
    }

    const tdHist = document.createElement("td");
    const botaoHist = document.createElement("button");
    botaoHist.type = "button";
    botaoHist.className = "secundario pequeno";
    botaoHist.textContent = "Ver";
    botaoHist.setAttribute("aria-label", `Ver histórico de ${ticker}`);
    botaoHist.addEventListener("click", () => carregarHistorico(ticker));
    tdHist.appendChild(botaoHist);

    const tdRemover = document.createElement("td");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "remover";
    botao.textContent = "✕";
    botao.title = `Remover ${ticker}`;
    botao.setAttribute("aria-label", `Remover ${ticker}`);
    botao.addEventListener("click", () => {
      carteira = carteira.filter((t) => t !== ticker);
      delete cotacoes[ticker];
      salvarCarteira();
      if (acaoSelecionada === ticker) {
        acaoSelecionada = null;
        $("historico").hidden = true;
      }
      desenharTabela();
    });
    tdRemover.appendChild(botao);

    linha.append(tdAtivo, tdPreco, tdVar, tdHist, tdRemover);
    corpo.appendChild(linha);
  }
}

async function adicionarAcao(evento) {
  evento.preventDefault();

  const campo = $("ticker");
  const ticker = campo.value.trim().toUpperCase();

  if (!/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
    $("acoes-aviso").textContent = "Código inválido. Exemplo: PETR4.";
    return;
  }
  if (carteira.includes(ticker)) {
    $("acoes-aviso").textContent = `${ticker} já está na lista.`;
    return;
  }

  $("acoes-aviso").textContent = `Buscando ${ticker}...`;

  try {
    cotacoes[ticker] = await buscarCotacao(ticker);
    carteira.push(ticker);
    salvarCarteira();
    campo.value = "";
    desenharTabela();
    $("acoes-aviso").textContent = `${ticker} adicionada.`;
    carregarHistorico(ticker);
  } catch (erro) {
    console.error(erro);
    $("acoes-aviso").textContent = obterToken()
      ? `Não encontrei ${ticker}.`
      : `Não consegui buscar ${ticker}. Sem token, só PETR4, VALE3, ITUB4 e MGLU3 funcionam. Cole um token gratuito da brapi.dev em "Tenho um token".`;
  }
}

/* ---------- BOLSA: histórico (subidas e descidas) ---------- */

// Procura, em qualquer formato de resposta, a lista de candles (com date e close).
function acharHistorico(no) {
  if (Array.isArray(no)) {
    if (no.length && no[0] && typeof no[0] === "object" && "close" in no[0] && "date" in no[0]) {
      return no;
    }
    for (const filho of no) {
      const achou = acharHistorico(filho);
      if (achou) return achou;
    }
    return null;
  }
  if (no && typeof no === "object") {
    for (const valor of Object.values(no)) {
      const achou = acharHistorico(valor);
      if (achou) return achou;
    }
  }
  return null;
}

function lerData(valor) {
  if (typeof valor === "number") return new Date(valor < 1e12 ? valor * 1000 : valor);
  return new Date(valor);
}

async function buscarHistorico(ticker, periodo) {
  const opcoes = opcoesRequisicao();
  const simbolo = encodeURIComponent(ticker);

  let dados;
  try {
    dados = await buscarJSON(
      `https://brapi.dev/api/quote/${simbolo}?range=${periodo}&interval=1d`,
      opcoes
    );
  } catch (erro) {
    if ([401, 402, 403, 404].includes(erro.status)) throw erro;
    dados = await buscarJSON(
      `https://brapi.dev/api/v2/stocks/historical?symbols=${simbolo}&range=${periodo}&interval=1d`,
      opcoes
    );
  }

  const bruto = acharHistorico(dados);
  if (!bruto) throw new Error("Sem dados de histórico");

  const dias = bruto
    .map((d) => ({ data: lerData(d.date), fechamento: Number(d.close) }))
    .filter((d) => !isNaN(d.data) && Number.isFinite(d.fechamento))
    .sort((a, b) => a.data - b.data);

  // Calcula a variação de cada dia em relação ao fechamento anterior.
  return dias.map((d, i) => {
    const anterior = i > 0 ? dias[i - 1].fechamento : null;
    return {
      ...d,
      varReais: anterior === null ? null : d.fechamento - anterior,
      varPct: anterior === null ? null : ((d.fechamento - anterior) / anterior) * 100,
    };
  });
}

async function carregarHistorico(ticker) {
  acaoSelecionada = ticker;
  desenharTabela();

  const periodo = $("periodo").value;
  const secao = $("historico");
  secao.hidden = false;
  $("historico-titulo").textContent = `Histórico de ${ticker}`;
  $("historico-resumo").textContent = "Carregando...";
  $("tabela-historico").replaceChildren();

  try {
    const dias = await buscarHistorico(ticker, periodo);
    // Evita mostrar dados de uma ação antiga se o usuário clicou em outra no meio do caminho.
    if (acaoSelecionada !== ticker) return;
    desenharHistorico(dias);
  } catch (erro) {
    console.error(erro);
    if (acaoSelecionada !== ticker) return;
    $("historico-resumo").textContent = obterToken()
      ? `Não foi possível carregar o histórico de ${ticker}.`
      : `Não foi possível carregar o histórico de ${ticker}. Sem token, só PETR4, VALE3, ITUB4 e MGLU3 funcionam.`;
  }
}

function desenharHistorico(dias) {
  const corpo = $("tabela-historico");
  corpo.replaceChildren();

  if (!dias.length) {
    $("historico-resumo").textContent = "Sem dados para o período.";
    return;
  }

  const primeiro = dias[0].fechamento;
  const ultimo = dias[dias.length - 1].fechamento;
  const totalPct = ((ultimo - primeiro) / primeiro) * 100;
  const maxima = Math.max(...dias.map((d) => d.fechamento));
  const minima = Math.min(...dias.map((d) => d.fechamento));
  const subidas = dias.filter((d) => d.varReais > 0).length;
  const descidas = dias.filter((d) => d.varReais < 0).length;

  const resumo = $("historico-resumo");
  resumo.replaceChildren();

  const total = document.createElement("strong");
  total.className = classeVariacao(totalPct);
  total.textContent = formatarPercentual(totalPct);

  resumo.append(
    "No período: ",
    total,
    ` · máxima ${fmtBRL.format(maxima)} · mínima ${fmtBRL.format(minima)} · ${subidas} dias de alta e ${descidas} de queda`
  );

  // Dias mais recentes primeiro.
  for (const d of [...dias].reverse()) {
    const linha = document.createElement("tr");

    const tdData = document.createElement("td");
    tdData.textContent = d.data.toLocaleDateString("pt-BR");

    const tdFech = document.createElement("td");
    tdFech.textContent = fmtBRL.format(d.fechamento);

    const tdReais = document.createElement("td");
    const tdPct = document.createElement("td");
    const tdSeta = document.createElement("td");

    if (d.varReais === null) {
      tdReais.textContent = "—";
      tdPct.textContent = "—";
      tdSeta.textContent = "";
    } else {
      const classe = d.varReais === 0 ? "" : classeVariacao(d.varReais);
      tdReais.className = classe;
      tdReais.textContent = formatarReais(d.varReais);
      tdPct.className = classe;
      tdPct.textContent = formatarPercentual(d.varPct);
      tdSeta.className = classe;
      tdSeta.textContent = d.varReais > 0 ? "▲" : d.varReais < 0 ? "▼" : "•";
      tdSeta.setAttribute("aria-label", d.varReais > 0 ? "alta" : d.varReais < 0 ? "queda" : "estável");
    }

    linha.append(tdData, tdFech, tdReais, tdPct, tdSeta);
    corpo.appendChild(linha);
  }
}

/* ---------- Início ---------- */

function iniciar() {
  preencherSelects();

  $("valor").addEventListener("input", converter);
  $("de").addEventListener("change", converter);
  $("para").addEventListener("change", converter);
  $("inverter").addEventListener("click", () => {
    const de = $("de").value;
    $("de").value = $("para").value;
    $("para").value = de;
    converter();
  });

  $("atualizar-moedas").addEventListener("click", carregarMoedas);
  $("atualizar-acoes").addEventListener("click", carregarAcoes);
  $("form-busca").addEventListener("submit", adicionarAcao);
  $("salvar-token").addEventListener("click", salvarToken);
  $("periodo").addEventListener("change", () => {
    if (acaoSelecionada) carregarHistorico(acaoSelecionada);
  });

  if (obterToken()) $("token-status").textContent = "Token ativo neste navegador.";

  carregarMoedas();
  carregarAcoes();
  carregarHistorico(carteira[0]);
}

iniciar();
