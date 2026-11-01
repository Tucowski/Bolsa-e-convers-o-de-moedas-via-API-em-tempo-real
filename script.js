/* ============================================================
   Câmbio & Bolsa
   - Moedas: AwesomeAPI (sem chave)
   - Ações:  brapi.dev (PETR4, VALE3, MGLU3 e ITUB4 funcionam sem token)
   ============================================================ */

// Se tiver um token da brapi.dev, coloque aqui para consultar qualquer ação.
// Atenção: em site público o token fica visível. Para produção, use um backend.
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

async function buscarJSON(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) {
    const erro = new Error(`HTTP ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return resposta.json();
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
  $("resultado-detalhe").textContent =
    `1 ${de} = ${formatarMoeda(taxa, para)}`;
}

/* ---------- BOLSA ---------- */

let carteira = carregarCarteira();
let cotacoes = {};

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
  const opcoes = BRAPI_TOKEN ? { headers: { Authorization: `Bearer ${BRAPI_TOKEN}` } } : undefined;
  const simbolo = encodeURIComponent(ticker);

  let dados;
  try {
    dados = await buscarJSON(`https://brapi.dev/api/v2/stocks/quote?symbols=${simbolo}`, opcoes);
  } catch (erro) {
    if (erro.status === 401 || erro.status === 402 || erro.status === 403 || erro.status === 404) throw erro;
    // Plano B: endpoint anterior da API
    dados = await buscarJSON(`https://brapi.dev/api/quote/${simbolo}`, opcoes);
  }

  const item = dados.results?.[0];
  if (!item) throw new Error("Ação não encontrada");
  return normalizarCotacao(item);
}

async function carregarAcoes() {
  $("acoes-aviso").textContent = "Atualizando...";
  let falhas = [];

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

  if (falhas.length) {
    $("acoes-aviso").textContent = BRAPI_TOKEN
      ? `Não foi possível carregar: ${falhas.join(", ")}.`
      : `Sem token, só PETR4, VALE3, ITUB4 e MGLU3 estão disponíveis. Falhou: ${falhas.join(", ")}.`;
  } else {
    $("acoes-aviso").textContent =
      "Atualizado às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
      ". Os preços podem ter atraso.";
  }
}

function desenharTabela() {
  const corpo = $("tabela-acoes");
  corpo.replaceChildren();

  for (const ticker of carteira) {
    const c = cotacoes[ticker];
    const linha = document.createElement("tr");

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
      desenharTabela();
    });
    tdRemover.appendChild(botao);

    linha.append(tdAtivo, tdPreco, tdVar, tdRemover);
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
  } catch (erro) {
    console.error(erro);
    $("acoes-aviso").textContent = BRAPI_TOKEN
      ? `Não encontrei ${ticker}.`
      : `Não consegui buscar ${ticker}. Sem token, só PETR4, VALE3, ITUB4 e MGLU3 funcionam.`;
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

  carregarMoedas();
  carregarAcoes();
}

iniciar();
