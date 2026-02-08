/*
 * Instalação das dependências:
 *   npm install lighthouse chrome-launcher mongodb
 */

const lighthouse = require('lighthouse/core/index.cjs');
const chromeLauncher = require('chrome-launcher');
const { MongoClient } = require('mongodb');

// === Configurações MongoDB ===
//const MONGO_URI = 'mongodb://localhost:27017//bpwa?authSource=bpwa';
const MONGO_URI = 'mongodb://localhost/:27017/';
const DB_NAME = 'benchmark';
const COLLECTION_NAME = 'relatoriosPWA';

async function gerarRelatorioComMelhorias(url) {

  // const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH, // vem do Dockerfile
    chromeFlags: [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  // Executa Lighthouse
  const runnerResult = await lighthouse(url, options);
  const reportObject = JSON.parse(runnerResult.report);

  // Extrai pontuações das categorias
  const categories = reportObject.categories || {};
  const scores = {
    performance: categories.performance?.score ?? null,
    accessibility: categories.accessibility?.score ?? null,
    bestPractices: categories['best-practices']?.score ?? null,
    seo: categories.seo?.score ?? null,
  };

  // Extrai métricas principais (em milissegundos)
  const audits = reportObject.audits || {};
  const metrics = {
    firstContentfulPaint: audits['first-contentful-paint']?.numericValue ?? null,
    largestContentfulPaint: audits['largest-contentful-paint']?.numericValue ?? null,
    speedIndex: audits['speed-index']?.numericValue ?? null,
    totalBlockingTime: audits['total-blocking-time']?.numericValue ?? null,
    cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue ?? null,
  };

  // Gera lista de melhorias: identifica auditorias com score < 1 (falhas ou avisos)
  const improvementPoints = [];
  for (const [auditId, audit] of Object.entries(audits)) {
    const score = audit.score;
    const mode = audit.scoreDisplayMode;
    // consideramos auditorias numéricas ou binarias (falhas) com score < 1 como pontos de melhoria
    if (score !== null && score < 1 && (mode === 'numeric' || mode === 'binary')) {
      improvementPoints.push({
        id: auditId,
        title: audit.title,
        score,
        displayValue: audit.displayValue || null,
        // corta a descrição para não armazenar textos muito longos (primeiros 300 caracteres)
        description: audit.description ? audit.description.substring(0, 300) : null,
      });
    }
  }

  // Prepara documento para armazenamento
  const documento = {
    url: reportObject.finalUrl || url,
    geradoEm: new Date(),
    lighthouseVersion: reportObject.lighthouseVersion,
    scores,
    metrics,
    improvements: improvementPoints,
    runWarnings: reportObject.runWarnings || [],
  };

  // Salva no MongoDB
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.insertOne(documento);
    console.log(`Relatório com melhorias armazenado com _id: ${result.insertedId}`);
  } catch (err) {
    console.error('Erro ao inserir no MongoDB:', err);
  } finally {
    await client.close();
    await chrome.kill();
  }
}

// Ponto de entrada
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Uso: node geraRelatorioPWA_Mongo_melhorias.js <url>');
  process.exit(1);
}
const url = args[0];

gerarRelatorioComMelhorias(url).catch((err) => {
  console.error('Erro ao gerar relatório com melhorias:', err);
});