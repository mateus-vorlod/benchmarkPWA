const fs = require('fs');
const { MongoClient } = require('mongodb');

function extrairResumoPWA(lhr) {
    const pwa = lhr.categories?.pwa;
    if (!pwa) {
        return { pwa_score: null };
    }

    const resumo = { pwa_score: pwa.score };

    // Cada auditRef tem um id; buscamos esse id em lhr.audits para pegar o score individual
    for (const ref of (pwa.auditRefs || [])) {
        const id = ref.id;
        const audit = lhr.audits?.[id];
        if (audit && typeof audit.score !== 'undefined') {
            resumo[id] = audit.score; // geralmente 0, 1 ou null
        } else {
            resumo[id] = null;
        }
    }

    return resumo;
}

function salvarCSV(resumo, path) {
    const header = Object.keys(resumo).join(',');
    const values = Object.values(resumo).join(',');
    fs.writeFileSync(path, `${header}\n${values}`);
}

async function salvarNoMongoDB(resumo, lhr, dataColeta) {
    const uri = 'mongodb://localhost:27017'; // ou sua URI do Atlas
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('benchmark');
        const colecao = db.collection('pwa_relatorios');

        const documento = {
            url: URL,
            dataColeta: dataColeta,
            scorePWA: resumo.scorePWA,
            detalhes: { ...resumo },
            jsonCompleto: lhr,
        };

        const { insertedId } = await colecao.insertOne(documento);
        console.log(`📥 Relatório salvo no MongoDB com _id: ${insertedId}`);
    } catch (e) {
        console.error('❌ Erro ao salvar no MongoDB:', e.message);
    } finally {
        await client.close();
    }
}

module.exports = { extrairResumoPWA, salvarCSV, salvarNoMongoDB };
