# Câmbio & Bolsa

Conversor de moedas e painel de cotações da bolsa brasileira (B3), feito com HTML, CSS e JavaScript puro, sem frameworks.

## O que faz

- Converte entre 9 moedas (real, dólar, euro, libra, iene, peso argentino, dólar canadense, franco suíço e bitcoin)
- Mostra cotações das moedas em reais, com variação do dia
- Acompanha ações da B3 com preço e variação
- Permite adicionar e remover ações; a lista fica salva no navegador (localStorage)
- Layout responsivo, funciona bem no celular

## Tecnologias

- HTML5, CSS3 e JavaScript (ES6+)
- `fetch` e `async/await` para consumir APIs
- [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas) para câmbio (gratuita, sem chave)
- [brapi.dev](https://brapi.dev) para ações

## Como rodar

Não precisa instalar nada. Baixe os arquivos e abra o `index.html` no navegador.

Se preferir um servidor local:

```bash
npx serve .
```

## Sobre a API de ações

Sem token, a brapi.dev libera apenas **PETR4, VALE3, ITUB4 e MGLU3**. Para consultar outras ações:

1. Crie uma conta em [brapi.dev](https://brapi.dev) e gere um token.
2. Cole o token na constante `BRAPI_TOKEN` no início do `script.js`.

> Em um site público, o token fica visível no código. Para uso real, o ideal é chamar a API por um backend.

## Como o conversor calcula

Todas as moedas são cotadas em reais, então a conversão usa o real como ponte:

```
resultado = valor × (cotação de A em reais ÷ cotação de B em reais)
```

## Publicar

- **GitHub Pages**: Settings → Pages → escolha a branch `main`.
- **Netlify**: arraste a pasta do projeto para o painel.

## Ideias para evoluir

- Gráfico com o histórico dos últimos 7 ou 30 dias
- Alertas de preço
- Modo claro/escuro
- Calcular o valor total de uma carteira (quantidade × preço)

## Aviso

Projeto de estudo. Os dados podem ter atraso e não são recomendação de investimento.


Site de referencia: bolsavaloresemoedas.netlify.app
