const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eventflow'
    });
    console.log('✅ Conexão com o MongoDB estabelecida com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar no MongoDB:', err);
    process.exit(1);
  }
};

module.exports = connectMongo;