const { default: lighthouse } = require('lighthouse');
const { writeFileSync, mkdirSync } = require('fs');
const { extrairResumoPWA, salvarCSV, salvarNoMongoDB } = require('./resumoUtils');
const { join } = require('path');
const chromeLauncher = require('chrome-launcher');

const URL = 'https://www.makemytrip.com/';
const DATA = new Date().toISOString().slice(0, 10);
const PASTA = `relatorios/${DATA}/pwa`;

(async () => {
    mkdirSync(PASTA, { recursive: true });

    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    const result = await lighthouse(URL, {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'info',
        onlyCategories: ['pwa'],
    });

    const { lhr, report } = result;
    const [htmlReport, jsonReport] = report;

    const jsonPath = join(PASTA, 'pwa-relatorio.json');
    const htmlPath = join(PASTA, 'pwa-relatorio.html');
    const csvPath  = join(PASTA, 'pwa-resumo.csv');

    writeFileSync(jsonPath, jsonReport);
    writeFileSync(htmlPath, htmlReport);

    // Extrai o score de PWA e os audits de PWA
    const resumo = extrairResumoPWA(lhr);
    salvarCSV(resumo, csvPath);
    await salvarNoMongoDB(resumo, lhr, DATA);



    console.log(`✅ Relatórios PWA salvos em: ${PASTA}`);
    await chrome.kill();
})();
