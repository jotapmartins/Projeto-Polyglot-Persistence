// ============================
// 🌐 Funções de navegação
// ============================
function abrirAreaCliente() {
  window.location.href = '/public/telainicial.html';
}

function abrirTelaCriarEvento() {
  window.location.href = '/public/criarEvento.html';
}

// ============================
// 📅 Cadastro de Novo Evento
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const formEvento = document.getElementById('formEvento');
  const modalCriarEvento = document.getElementById('modalCriarEvento');
  const btnCriarEvento = document.getElementById('btnCriarEvento');

  // 🔹 Abre o modal de criação de evento
  if (btnCriarEvento) {
    btnCriarEvento.addEventListener('click', () => {
      modalCriarEvento.classList.add('active');
    });
  }

  // 🔹 Fecha o modal ao clicar fora ou no botão X
  document.querySelectorAll('.modal-close, #modalCriarEvento').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) modalCriarEvento.classList.remove('active');
    });
  });

  // 🔹 Envia o formulário de cadastro
  if (formEvento) {
    formEvento.addEventListener('submit', async e => {
      e.preventDefault();

      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const codEmpresa = localStorage.getItem('cod_empresa');

      if (!codEmpresa) {
        alert('❌ Erro: Empresa não encontrada. Faça o login novamente.');
        return;
      }

      const formData = new FormData(formEvento);
      formData.append('cod_empresa', codEmpresa);

      const submitButton = formEvento.querySelector('.btn-submit');
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="ph ph-spinner-gap"></i> Cadastrando...';

      try {
        const response = await fetch('http://localhost:5521/cadastrar-evento', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          alert('✅ Evento cadastrado com sucesso!');
          carregarTabelaEventos()
          modalCriarEvento.classList.remove('active');
          formEvento.reset();
        } else {
          alert('❌ Erro: ' + (data.message || 'Falha ao cadastrar.'));
        }
      } catch (err) {
        console.error('Erro ao enviar:', err);
        alert('Erro de conexão ao cadastrar o evento.');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="ph ph-check-circle"></i> Cadastrar Evento';
      }
    });
  }
});
// Carregar tabela de eventos

async function carregarTabelaEventos() {
  try {
    const codEmpresa = localStorage.getItem('cod_empresa');

    if (!codEmpresa) {
      console.error('❌ Código da empresa não encontrado no localStorage.');
      return;
    }

    const response = await fetch('http://localhost:5521/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cod_empresa: codEmpresa })
    });

    const data = await response.json();
    const tabela = document.getElementById('eventList');
    tabela.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum evento encontrado</td></tr>`;
      return;
    }

    // Preenche a tabela
    data.forEach(evento => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${evento.nome_evento || '-'}</td>
        <td>${formatarData(evento.dt_evento)}</td>
        <td>${evento.hr_inicio_evento ? evento.hr_inicio_evento.slice(0,5) : '-'}</td>
        <td>${evento.hr_fim_evento ? evento.hr_fim_evento.slice(0,5) : '-'}</td>
        <td>${evento.limite_pessoas || '-'}</td>
        <td>${evento.cidade || '-'}</td>
        <td style="text-align:center;">
          <button class="btn-excluir" onclick="excluirEvento(${evento.cod_evento})">❌</button>
        </td>
      `;
      tabela.appendChild(tr);
    });
  } catch (err) {
    console.error('⚠️ Erro ao carregar eventos:', err);
  }
}

function formatarData(dataStr) {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

async function excluirEvento(cod_evento) {
  if (!confirm('Deseja realmente excluir este evento?')) return;

  const codEmpresa = localStorage.getItem('cod_empresa');

  if (!codEmpresa) {
    alert('❌ Erro: Empresa não encontrada. Faça o login novamente.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5521/excluir-evento', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cod_evento, cod_empresa: codEmpresa })
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ Evento excluído com sucesso!');
      carregarTabelaEventos();
    } else {
      alert('❌ Erro: ' + (data.message || 'Falha ao excluir evento.'));
    }
  } catch (err) {
    console.error('Erro ao excluir evento:', err);
    alert('Erro de conexão ao tentar excluir o evento.');
  }
}

document.addEventListener('DOMContentLoaded', carregarTabelaEventos);


function formatarData(dataStr) {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

