const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
const routes = require('./routes');
const db = require('./db');

app.use(cors()); 
app.use(express.json());
app.use('/api', routes); 

db.pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco de dados:', err.stack);
    }
    console.log('Conexão ao banco de dados estabelecida com sucesso');
    release();
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
