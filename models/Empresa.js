const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
  cod_colaborador: {
    type: Number,
    required: true
  },
  razao_social: {
    type: String,
    required: true,
    trim: true
  },
  desc_comercial: {
    type: String,
    required: true,
    trim: true
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  telefone: {
    type: String,
    required: true
  },
  endereco: {
    cep:         { type: String },
    logradouro:  { type: String },
    numero:      { type: String },
    complemento: { type: String },
    bairro:      { type: String },
    cidade:      { type: String },
    estado:      { type: String }
  }
}, {
  timestamps: true  // cria createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('Empresa', EmpresaSchema);