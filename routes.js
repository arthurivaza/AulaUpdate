const express = require('express');
const router = express.Router();
const db = require('./db');

const pendingTransactions = {};

router.get('/clientes', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM cliente ORDER BY id');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).send('Erro ao buscar clientes: ' + error.message);
    }
});

router.post('/iniciar-atualizacao/:id', async (req, res) => {
    const { id } = req.params;
    const { novoLimite, novoNome } = req.body;

    if (pendingTransactions[id]) {
        return res.status(400).send(`A atualização para o cliente ${id} já está em andamento.`);
    }

    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        await client.query('SELECT * FROM cliente WHERE id = $1 FOR UPDATE', [id]);

        pendingTransactions[id] = { client, novoLimite, novoNome };

        res.status(200).send(`Transação de atualização para o cliente ${id} iniciada. Aguardando confirmação.`);
    } catch (error) {
        client.release();
        res.status(500).send('Erro ao iniciar a atualização: ' + error.message);
    }
});

router.post('/confirmar-atualizacao/:id', async (req, res) => {
    const { id } = req.params;

    if (!pendingTransactions[id]) {
        return res.status(404).send('Transação pendente não encontrada para o cliente.');
    }

    const { client, novoLimite, novoNome } = pendingTransactions[id];

    try {
        await client.query('UPDATE cliente SET limite = $1, nome = $2 WHERE id = $3', [novoLimite, novoNome, id]);
        await client.query('COMMIT');

        delete pendingTransactions[id];
        client.release();

        res.status(200).send(`Cliente ${id} atualizado com sucesso.`);
    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        res.status(500).send('Erro ao confirmar atualização: ' + error.message);
    }
});

router.post('/cancelar-atualizacao/:id', async (req, res) => {
    const { id } = req.params;

    if (!pendingTransactions[id]) {
        return res.status(404).send('Transação pendente não encontrada para o cliente.');
    }

    const { client } = pendingTransactions[id];

    try {
        await client.query('ROLLBACK');
        
        delete pendingTransactions[id];
        client.release();

        res.status(200).send(`Atualização do cliente ${id} foi cancelada.`);
    } catch (error) {
        client.release();
        res.status(500).send('Erro ao cancelar atualização: ' + error.message);
    }
});

module.exports = router;
