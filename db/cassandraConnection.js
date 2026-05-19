const { Client } = require('cassandra-driver');
const path = require('path');

const client = new Client({
  cloud: {
    secureConnectBundle: path.join(__dirname, '..', 'secure-connect-db-eventflow.zip')
  },
  credentials: {
    username: process.env.ASTRA_CLIENT_ID,
    password: process.env.ASTRA_CLIENT_SECRET
  },
  keyspace: 'eventflow_db'
});

async function connectCassandra() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Cassandra (Astra DB) com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar no Cassandra:', err);
  }
}

module.exports = {
  client,
  connectCassandra
};