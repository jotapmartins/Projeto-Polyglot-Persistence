require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 5521;

const mongoose = require('mongoose');
const connectMongo = require('./db/mongoConnection');
const Empresa = require('./models/Empresa');

// Chama a conexão com o MongoDB
connectMongo();

const { client: cassandra, connectCassandra } = require('./db/cassandraConnection');

connectCassandra();

app.use(cors({ origin: '*' }));


app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco de dados:', err);
  } else {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function gerarHash(senha) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(senha, saltRounds);
  return hash;
}
const multer = require('multer');

// --- Configuração do Multer (Upload de Imagem) ---
const storage = multer.diskStorage({
  // Define a pasta de destino
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  // Define o nome do arquivo
  filename: (req, file, cb) => {
    // Cria um nome único: timestamp + nome original
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// Habilita o filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo não suportado! Envie apenas imagens.'), false);
  }
};

// Inicializa o middleware de upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});


// ----------------------------------------------------
//Cadastrar Evento
// app.post('/cadastrar-evento', upload.none(), (req, res) => {
//   try {
//     const {
//       nome_evento,
//       end_evento,
//       nome_local_evento,
//       limite_pessoas,
//       dt_evento,
//       vl_ingresso,
//       hr_inicio_evento,
//       hr_fim_evento,
//       cod_empresa,
//       cidade,
//       link_imagem
//     } = req.body;

//     if (!cod_empresa) {
//       return res.status(400).json({
//         message: 'Erro: Código da empresa não encontrado. Faça login novamente.'
//       });
//     }

//     const sql = `
//       INSERT INTO cd_eventos (
//         cod_empresa, nome_evento, end_evento, nome_local_evento, 
//         limite_pessoas, dt_evento, vl_ingresso, hr_inicio_evento, 
//         hr_fim_evento, cidade, link_imagem
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const valores = [
//       cod_empresa,
//       nome_evento,
//       end_evento,
//       nome_local_evento,
//       limite_pessoas,
//       dt_evento,
//       vl_ingresso,
//       hr_inicio_evento,
//       hr_fim_evento,
//       cidade,
//       link_imagem
//     ];

//     db.query(sql, valores, (err, result) => {
//       if (err) {
//         console.error('❌ Erro ao cadastrar evento:', err);
//         return res.status(500).json({ message: 'Erro interno ao salvar o evento.' });
//       }

//       res.status(201).json({
//         message: '✅ Evento cadastrado com sucesso!',
//         eventoId: result.insertId
//       });
//     });
//   } catch (error) {
//     console.error('❌ Erro no endpoint /cadastrar-evento:', error);
//     res.status(500).json({ message: 'Erro interno do servidor.' });
//   }
// });

app.post('/cadastrar-evento', upload.none(), async (req, res) => {
  try {
    const {
      nome_evento, end_evento, nome_local_evento, limite_pessoas,
      dt_evento, vl_ingresso, hr_inicio_evento, hr_fim_evento,
      cod_empresa, cidade, link_imagem
    } = req.body;

    if (!cod_empresa) {
      return res.status(400).json({ message: 'Código da empresa não informado.' });
    }

    // Gerar um código simples para o evento (baseado em timestamp)
    const cod_evento = Date.now();

    const query = `
      INSERT INTO eventflow_db.eventos 
      (cod_empresa, cod_evento, nome_evento, end_evento, nome_local_evento, 
       limite_pessoas, dt_evento, vl_ingresso, hr_inicio_evento, hr_fim_evento, 
       cidade, link_imagem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await cassandra.execute(query, [
      parseInt(cod_empresa),
      cod_evento, 
      nome_evento, 
      end_evento, 
      nome_local_evento,
      parseInt(limite_pessoas), 
      dt_evento, 
      parseFloat(vl_ingresso), 
      hr_inicio_evento, 
      hr_fim_evento, 
      cidade, 
      link_imagem
    ], { prepare: true });

    res.status(201).json({ message: '✅ Evento cadastrado com sucesso!', eventoId: cod_evento });

  } catch (error) {
    console.error('❌ Erro ao cadastrar evento:', error);
    res.status(500).json({ message: 'Erro interno ao salvar o evento.' });
  }
});


//Lista evento conforme empresa
// app.post('/eventos', (req, res) => {
//   try {
//     const { cod_empresa } = req.body;

//     if (!cod_empresa) {
//       return res.status(400).json({ message: 'Código da empresa não informado.' });
//     }

//     const sql = 'SELECT * FROM cd_eventos WHERE cod_empresa = ?';

//     db.query(sql, [cod_empresa], (err, results) => {
//       if (err) {
//         console.error('❌ Erro ao buscar eventos:', err);
//         return res.status(500).json({ message: 'Erro interno ao consultar eventos.' });
//       }

//       if (results.length === 0) {
//         return res.status(404).json({ message: 'Nenhum evento encontrado para esta empresa.' });
//       }

//       res.status(200).json(results);
//     });
//   } catch (error) {
//     console.error('❌ Erro no endpoint /eventos:', error);
//     res.status(500).json({ message: 'Erro interno do servidor.' });
//   }
// });

app.post('/eventos', async (req, res) => {
  try {
    const { cod_empresa } = req.body;

    if (!cod_empresa) {
      return res.status(400).json({ message: 'Código da empresa não informado.' });
    }

    const query = `SELECT * FROM eventflow_db.eventos WHERE cod_empresa = ?`;
    const result = await cassandra.execute(query, [parseInt(cod_empresa)], { prepare: true });

    if (result.rowLength === 0) {
      return res.status(404).json({ message: 'Nenhum evento encontrado para esta empresa.' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro interno ao consultar eventos.' });
  }
});


// EXCLUIR EVENTO
// app.delete('/excluir-evento', (req, res) => {
//   const { cod_evento } = req.body;

//   if (!cod_evento) {
//     return res.status(400).json({ message: 'Código do evento não informado.' });
//   }

//   const sql = 'DELETE FROM cd_eventos WHERE cod_evento = ?';

//   db.query(sql, [cod_evento], (err, result) => {
//     if (err) {
//       console.error('❌ Erro ao excluir evento:', err);
//       return res.status(500).json({ message: 'Erro interno ao excluir o evento.' });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Evento não encontrado.' });
//     }

//     res.status(200).json({ message: 'Evento excluído com sucesso!' });
//   });
// });

app.delete('/excluir-evento', async (req, res) => {
  try {
    const { cod_evento, cod_empresa } = req.body;

    if (!cod_evento || !cod_empresa) {
      return res.status(400).json({ message: 'Código do evento e da empresa são obrigatórios.' });
    }

    const query = `DELETE FROM eventflow_db.eventos WHERE cod_empresa = ? AND cod_evento = ?`;
    await cassandra.execute(query, [parseInt(cod_empresa), parseInt(cod_evento)], { prepare: true });
    
    res.status(200).json({ message: 'Evento excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir evento:', error);
    res.status(500).json({ message: 'Erro interno ao excluir o evento.' });
  }
});

// LISTAR TODOS OS EVENTOS
// app.get('/eventos-geral', (req, res) => {
//   const sql = 'SELECT * FROM cd_eventos';

//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error('❌ Erro ao buscar eventos:', err);
//       return res.status(500).json({ message: 'Erro interno ao buscar eventos.' });
//     }

//     // Imagem padrão
//     const imagemPadrao = 'https://cdn-icons-png.flaticon.com/512/2748/2748558.png';

//     // Substitui NULL por imagem padrão
//     const eventos = results.map(ev => ({
//       ...ev,
//       link_imagem: ev.link_imagem || imagemPadrao
//     }));

//     res.status(200).json(eventos);
//   });
// });

app.get('/eventos-geral', async (req, res) => {
  try {
    // Busca todos os eventos (pode ser pesado em produção)
    const query = `SELECT * FROM eventflow_db.eventos`;
    const result = await cassandra.execute(query);

    const imagemPadrao = 'https://cdn-icons-png.flaticon.com/512/2748/2748558.png';
    const eventos = result.rows.map(ev => ({
      ...ev,
      link_imagem: ev.link_imagem || imagemPadrao
    }));

    res.status(200).json(eventos);
  } catch (error) {
    console.error('❌ Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro interno ao buscar eventos.' });
  }
});

//Função de cadastrar o usuario
app.post('/cadastrarUsuario', async (req, res) => {
  const { nome_user, email_user, cpf_user, senha } = req.body;

  if (!nome_user || !email_user || !cpf_user || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    const checkSql = 'SELECT * FROM cd_usuarios WHERE cpf_user = ?';
    db.query(checkSql, [cpf_user], async (err, results) => {
      if (err) {
        console.error('Erro ao verificar CPF:', err);
        return res.status(500).json({ message: 'Erro no servidor.' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Este CPF já está cadastrado.' });
      }

      // Cria o hash da senha
      const hash = await bcrypt.hash(senha, 10);

      const insertSql = `
        INSERT INTO cd_usuarios (nome_user, email_user, cpf_user, senha)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertSql, [nome_user, email_user, cpf_user, hash], (err2) => {
        if (err2) {
          console.error('Erro ao cadastrar usuário:', err2);
          return res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
        }

        console.log(`Novo usuário cadastrado: ${nome_user}`);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
      });
    });
  } catch (error) {
    console.error('Erro ao processar cadastro:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});


//Funcao para fazer login 
app.post('/login', (req, res) => {
  const { email_user, senha } = req.body;

  if (!email_user || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  const sql = `
    SELECT
	cdu.*,
    cde.cod_empresa
  FROM cd_usuarios as cdu
  LEFT JOIN cd_empresas as cde
  ON cdu.cod_user = cde.cod_colaborador
  WHERE cdu.email_user = ? LIMIT 1
  `;
  db.query(sql, [email_user], async (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ message: 'Erro no servidor.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(senha, user.senha);
      if (!match) {
        return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
      }


      delete user.senha;

      return res.status(200).json({
        message: 'Login realizado com sucesso!',
        user: user 
      });
      
    } catch (compareErr) {
      console.error('Erro ao comparar senha:', compareErr);
      return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
  });
});


// Cadastrar empresa no MongoDB
app.post('/cadastrar-empresa', async (req, res) => {
  const {
    nome_fantasia,
    cnpj,
    cod_colaborador,
    razao_social,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado
  } = req.body;

  if (!nome_fantasia || !cnpj || !cod_colaborador) {
    return res.status(400).json({
      message: 'Campos principais (Nome Fantasia, CNPJ e Usuário) são obrigatórios.'
    });
  }

  try {
    const jaExiste = await Empresa.findOne({ cnpj });
    if (jaExiste) {
      return res.status(409).json({ message: 'Este CNPJ já está cadastrado.' });
    }

    const novaEmpresa = new Empresa({
      cod_colaborador,
      razao_social,
      desc_comercial: nome_fantasia,
      cnpj,
      telefone,
      endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado }
    });

    const salva = await novaEmpresa.save();

    res.status(201).json({
      message: '✅ Empresa cadastrada com sucesso no MongoDB!',
      empresaId: salva._id
    });

  } catch (err) {
    console.error('❌ Erro ao cadastrar empresa no MongoDB:', err);
    res.status(500).json({ message: 'Erro interno ao salvar a empresa.' });
  }
});


//Verifica se o usuario tem uma empresa cadastrada
app.get('/verificar-empresa/:cod_user', async (req, res) => {
  const { cod_user } = req.params;

  try {
    const empresa = await Empresa.findOne({ cod_colaborador: Number(cod_user) });

    if (empresa) {
      return res.status(200).json({ 
        temEmpresa: true, 
        cod_empresa: empresa.cod_colaborador // ✅ número inteiro, não o _id
      });
    } else {
      return res.status(200).json({ temEmpresa: false });
    }
  } catch (err) {
    console.error('Erro ao verificar empresa:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// Confirmar Presença em Evento
app.post('/confirmar-presenca', async (req, res) => {
  const { cod_user, cod_evento } = req.body;

  if (!cod_user || !cod_evento) {
    return res.status(400).json({ sucesso: false, msg: 'Dados incompletos.' });
  }

  try {
    const [existe] = await db
      .promise()
      .query(
        'SELECT * FROM ct_confirmacao_presenca WHERE cod_user = ? AND cod_evento = ?',
        [cod_user, cod_evento]
      );

    if (existe.length > 0) {
      return res.status(400).json({ sucesso: false, msg: 'Você já confirmou presença neste evento.' });
    }

    await db
      .promise()
      .query(
        'INSERT INTO ct_confirmacao_presenca (cod_user, cod_evento) VALUES (?, ?)',
        [cod_user, cod_evento]
      );

    res.json({ sucesso: true, msg: 'Presença confirmada com sucesso!' });
  } catch (err) {
    console.error('Erro ao confirmar presença:', err);
    res.status(500).json({ sucesso: false, msg: 'Erro no servidor.' });
  }
});


//Verificar presenca de usuario
app.get('/presencas/:cod_user', async (req, res) => {
  const { cod_user } = req.params;

  try {
    const [rows] = await db
      .promise()
      .query('SELECT cod_evento FROM ct_confirmacao_presenca WHERE cod_user = ?', [cod_user]);

    res.json(rows); // retorna um array com os eventos confirmados
  } catch (err) {
    console.error('Erro ao buscar presenças:', err);
    res.status(500).json({ erro: 'Erro ao buscar presenças.' });
  }
});


// Listar eventos confirmados de um usuário
app.get('/eventos-confirmados/:cod_user', async (req, res) => {
  const { cod_user } = req.params;

  try {
    const [rows] = await db.promise().query(
      `
      SELECT e.cod_evento, e.nome_evento, e.dt_evento, e.cidade
      FROM ct_confirmacao_presenca c
      JOIN cd_eventos e ON e.cod_evento = c.cod_evento
      WHERE c.cod_user = ?
      `,
      [cod_user]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar eventos confirmados:', err);
    res.status(500).json({ erro: 'Erro ao buscar eventos confirmados.' });
  }
});


// Cancelar presença em um evento
app.delete('/cancelar-presenca', async (req, res) => {
  const { cod_user, cod_evento } = req.body;

  if (!cod_user || !cod_evento) {
    return res.status(400).json({ erro: 'Dados incompletos.' });
  }

  try {
    const [result] = await db
      .promise()
      .query('DELETE FROM ct_confirmacao_presenca WHERE cod_user = ? AND cod_evento = ?', [cod_user, cod_evento]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Presença não encontrada.' });
    }

    res.json({ sucesso: true, msg: 'Presença cancelada com sucesso.' });
  } catch (err) {
    console.error('Erro ao cancelar presença:', err);
    res.status(500).json({ erro: 'Erro ao cancelar presença.' });
  }
});


// GET /eventos/:id
app.get('/eventos/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT cod_evento, nome_evento, cidade, dt_evento, end_evento, nome_local_evento
    FROM cd_eventos
    WHERE cod_evento = ?
    LIMIT 1
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ msg: 'Erro ao buscar evento.' });
    if (!rows.length) return res.status(404).json({ msg: 'Evento não encontrado.' });
    res.json(rows[0]);
  });
});


// Atualizar dados do usuário
app.put('/atualizar-usuario/:cod_user', async (req, res) => {
  const { cod_user } = req.params;
  const { nome_user, email_user, senha } = req.body;

  if (!nome_user || !email_user) {
    return res.status(400).json({ message: 'Nome e e-mail são obrigatórios.' });
  }

  try {
    let sql;
    let valores;

    if (senha && senha.trim() !== '') {
      // Atualiza com senha nova
      const hash = await bcrypt.hash(senha, 10);
      sql = 'UPDATE cd_usuarios SET nome_user = ?, email_user = ?, senha = ? WHERE cod_user = ?';
      valores = [nome_user, email_user, hash, cod_user];
    } else {
      // Atualiza sem alterar senha
      sql = 'UPDATE cd_usuarios SET nome_user = ?, email_user = ? WHERE cod_user = ?';
      valores = [nome_user, email_user, cod_user];
    }

    db.query(sql, valores, (err, result) => {
      if (err) {
        console.error('Erro ao atualizar usuário:', err);
        return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    });
  } catch (error) {
    console.error('Erro interno ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

app.get('/presencas/checar', (req, res) => {
  const { cod_user, cod_evento } = req.query;
  const sql = `
    SELECT id FROM ct_confirmacao_presenca
    WHERE cod_user = ? AND cod_evento = ?
    LIMIT 1
  `;
  db.query(sql, [cod_user, cod_evento], (err, rows) => {
    if (err) return res.status(500).json({ ok: false });
    res.json({ ok: !!rows.length });
  });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
