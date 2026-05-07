// SLIDER
const slides = document.querySelectorAll('.slide');
let index = 0;

function showSlide(i) {
  slides.forEach(slide => slide.classList.remove('active'));
  slides[i].classList.add('active');
}

document.getElementById('next').onclick = () => {
  index = (index + 1) % slides.length;
  showSlide(index);
};

document.getElementById('prev').onclick = () => {
  index = (index - 1 + slides.length) % slides.length;
  showSlide(index);
};

setInterval(() => {
  index = (index + 1) % slides.length;
  showSlide(index);
}, 6000);



const profileIcon = document.getElementById('profileIcon');
const profileSidebar = document.getElementById('profileSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

const modal = document.getElementById('profileModal');
const editProfileBtn = document.getElementById('editProfileBtn'); // Botão dentro da sidebar
const close = document.getElementById('closeModal');

const closeTheSidebar = () => {
  profileSidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
};

profileIcon.onclick = () => {
  profileSidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
};

closeSidebar.onclick = closeTheSidebar;
sidebarOverlay.onclick = closeTheSidebar;


editProfileBtn.onclick = (e) => {
  e.preventDefault(); 
  modal.style.display = 'block';
  closeTheSidebar(); 
};

close.onclick = () => modal.style.display = 'none';

window.onclick = (e) => { 
  if (e.target == modal) {
    modal.style.display = 'none'; 
  }
};


// BOTAO EMPRESARIAL
const empresaBtn = document.querySelector('.empresa-btn');

empresaBtn.addEventListener('click', async () => {
  
  const usuarioString = localStorage.getItem('usuario');
  
  if (!usuarioString) {
    alert('Você precisa estar logado para acessar a área empresarial.');
    window.location.href = '/public/login.html'; 
    return;
  }

  const usuarioLogado = JSON.parse(usuarioString);
  const codColaborador = usuarioLogado.cod_user;

  if (!codColaborador) {
    alert('Erro ao identificar seu usuário. Faça login novamente.');
    localStorage.removeItem('usuario');
    window.location.href = '/public/login.html';
    return;
  }

  try {
    const resposta = await fetch(`http://localhost:5521/verificar-empresa/${codColaborador}`);

    if (!resposta.ok) throw new Error('Não foi possível verificar os dados da empresa.');

    const data = await resposta.json();

    if (data.temEmpresa) {
      // ✅ Salva o _id do MongoDB no localStorage antes de redirecionar
      localStorage.setItem('cod_empresa', data.cod_empresa);
      window.location.href = '/public/dashEstabelecimento.html';
    } else {
      window.location.href = '/public/cadastroEmpresarial.html';
    }

  } catch (error) {
    console.error('Erro ao verificar empresa:', error);
    alert('Erro de conexão. Não foi possível verificar sua empresa.');
  }
});

function sairSistema(){
        window.location.href = '/public/index.html';
        localStorage.clear();

}
let eventosCache = []; // Armazena os eventos carregados do backend

async function carregarEventosGerais() {
  const container = document.querySelector('.gallery-container');
  container.innerHTML = '<p style="text-align:center;color:#aaa;">Carregando eventos...</p>';

  try {
    const response = await fetch('http://localhost:5521/eventos-geral');
    const data = await response.json();
    container.innerHTML = '';
    eventosCache = data;

    if (!response.ok || !Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:#777;">Nenhum evento disponível no momento.</p>`;
      return;
    }

    // Busca presenças confirmadas do usuário logado (se estiver logado)
    let eventosConfirmados = [];
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (usuario?.cod_user) {
      const presencasResponse = await fetch(`http://localhost:5521/presencas/${usuario.cod_user}`);
      if (presencasResponse.ok) {
        const presencas = await presencasResponse.json();
        eventosConfirmados = presencas.map(p => p.cod_evento);
      }
    }

    renderizarEventos(data, eventosConfirmados);
  } catch (err) {
    console.error('Erro ao carregar eventos gerais:', err);
    container.innerHTML = '<p style="text-align:center;color:red;">Erro ao carregar os eventos.</p>';
  }
}


function renderizarEventos(lista, confirmados = []) {
  const container = document.querySelector('.gallery-container');
  container.innerHTML = '';

  if (!lista.length) {
    container.innerHTML = `<p style="text-align:center;color:#777;">Nenhum evento encontrado.</p>`;
    return;
  }

  lista.forEach(evento => {
    const dataFormatada = evento.dt_evento
      ? new Date(evento.dt_evento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : '-';

    const imagem = evento.link_imagem && evento.link_imagem.trim() !== ''
      ? evento.link_imagem
      : 'https://cdn-icons-png.flaticon.com/512/2748/2748558.png';

    const card = document.createElement('div');
    card.classList.add('event-card');

    const jaConfirmado = confirmados.includes(evento.cod_evento);

    card.innerHTML = `
      <div class="card-banner">
        <img src="${imagem}" alt="${evento.nome_evento}">
      </div>
      <div class="card-content">
        <h3 class="event-name">${evento.nome_evento || 'Evento sem nome'}</h3>
        <div class="event-info">
          <div class="info-item"><i class="ph ph-calendar"></i> ${dataFormatada}</div>
          <div class="info-item"><i class="ph ph-map-pin"></i> ${evento.cidade || 'Local não informado'}</div>
        </div>
        <button class="btn-more">${jaConfirmado ? 'Emitir Certificado 🎓' : 'Confirmar Presença'}</button>
      </div>
    `;

    const botao = card.querySelector('.btn-more');

    if (!jaConfirmado) {
      botao.addEventListener('click', async () => {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        if (!usuario?.cod_user) {
          alert('Você precisa estar logado para confirmar presença.');
          return;
        }

        try {
          const res = await fetch('http://localhost:5521/confirmar-presenca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cod_user: usuario.cod_user,
              cod_evento: evento.cod_evento,
            }),
          });

          const data = await res.json();
          alert(data.msg);
          window.location.reload();

          if (data.sucesso) {
            botao.textContent = 'Emitir Certificado 🎓';
            botao.disabled = true;
          }
        } catch (err) {
          console.error('Erro ao confirmar presença:', err);
          alert('Erro ao confirmar presença. Tente novamente.');
        }
      });
    } else {
      // Ação do botão se já estiver confirmado
      botao.addEventListener('click', () => {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        if (!usuario?.cod_user) {
          alert('Você precisa estar logado para gerar o certificado.');
          return;
        }

        // Salva as informações necessárias para a tela do certificado
        localStorage.setItem('certificado_info', JSON.stringify({
          cod_user: usuario.cod_user,
          nome_user: usuario.nome_user,
          cod_evento: evento.cod_evento
        }));

        // Redireciona para a página do certificado
        window.location.href = '/public/certificado.html';
      });
    }
    container.appendChild(card);
  });
}


function aplicarFiltros() {
  const inputBusca = document.querySelector('.search-bar input').value.trim().toLowerCase();
  const selectCidade = document.querySelector('.navigation select').value;

  let filtrados = eventosCache;

  // Filtro por nome do evento
  if (inputBusca !== '') {
    filtrados = filtrados.filter(e =>
      e.nome_evento?.toLowerCase().includes(inputBusca)
    );
  }

  // Filtro por cidade (ignora "Todas cidades")
  if (selectCidade !== 'Todas cidades') {
    filtrados = filtrados.filter(e =>
      e.cidade?.toLowerCase() === selectCidade.toLowerCase()
    );
  }

  renderizarEventos(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
  carregarEventosGerais();

  document.querySelector('.search-bar input').addEventListener('input', aplicarFiltros);
  document.querySelector('.navigation select').addEventListener('change', aplicarFiltros);
});


const modalConfirmados = document.getElementById('modalEventosConfirmados');
const closeModalConfirmados = document.getElementById('closeModalConfirmados');
const listaEventosConfirmados = document.getElementById('listaEventosConfirmados');

// Quando clicar no menu lateral "Eventos Confirmados"
document.querySelector('.sidebar-link i.ph-ticket').parentElement.addEventListener('click', async (e) => {
  e.preventDefault();
  await abrirModalEventosConfirmados();
});

closeModalConfirmados.onclick = () => {
  modalConfirmados.style.display = 'none';
};

window.onclick = (e) => {
  if (e.target === modalConfirmados) modalConfirmados.style.display = 'none';
};

async function abrirModalEventosConfirmados() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario?.cod_user) {
    alert('Você precisa estar logado.');
    return;
  }

  modalConfirmados.style.display = 'block';
  listaEventosConfirmados.innerHTML = '<p style="text-align:center;color:#aaa;">Carregando...</p>';

  try {
    const res = await fetch(`http://localhost:5521/eventos-confirmados/${usuario.cod_user}`);
    const data = await res.json();

    listaEventosConfirmados.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      listaEventosConfirmados.innerHTML = `<p style="text-align:center;color:#777;">Nenhum evento confirmado ainda.</p>`;
      return;
    }

    data.forEach(evento => {
      const dataFormatada = evento.dt_evento
        ? new Date(evento.dt_evento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : '-';

      const item = document.createElement('div');
      item.classList.add('event-item');
      item.innerHTML = `
        <div>
          <strong>${evento.nome_evento}</strong><br>
          <small>${dataFormatada} - ${evento.cidade || 'Local não informado'}</small>
        </div>
        <button>Cancelar Presença</button>
      `;

      item.querySelector('button').addEventListener('click', async () => {
        if (confirm(`Deseja realmente cancelar a presença no evento "${evento.nome_evento}"?`)) {
          await cancelarPresenca(evento.cod_evento);
          item.remove();
          window.location.reload()
        }
      });

      listaEventosConfirmados.appendChild(item);
    });
  } catch (err) {
    console.error('Erro ao buscar eventos confirmados:', err);
    listaEventosConfirmados.innerHTML = '<p style="text-align:center;color:red;">Erro ao carregar eventos.</p>';
  }
}

async function cancelarPresenca(cod_evento) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario?.cod_user) return;

  try {
    const res = await fetch('http://localhost:5521/cancelar-presenca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cod_user: usuario.cod_user,
        cod_evento
      }),
    });

    const data = await res.json();
    alert(data.msg || 'Presença cancelada.');

  } catch (err) {
    console.error('Erro ao cancelar presença:', err);
    alert('Erro ao cancelar presença.');
  }
}
/**
 * Preenche o formulário de edição de perfil com os dados do usuário logado.
 */
function preencherCamposPerfil() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    console.error("Usuário não encontrado no localStorage!");
    return;
  }

  // Preenche os campos
  document.getElementById("nome").value = usuario.nome_user || "";
  document.getElementById("email").value = usuario.email_user || "";
  document.getElementById("senha").value = ""; // senha sempre em branco
}

/**
 * Atualiza os dados do perfil no banco e no localStorage.
 */
async function salvarPerfil() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (!usuario) {
    alert("Usuário não encontrado no localStorage!");
    return;
  }

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!nome || !email) {
    alert("Preencha nome e e-mail corretamente.");
    return;
  }

  try {
    const response = await fetch(`http://localhost:5521/atualizar-usuario/${usuario.cod_user}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome_user: nome,
        email_user: email,
        senha
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Perfil atualizado com sucesso!");

      // Atualiza os dados no localStorage
      usuario.nome_user = nome;
      usuario.email_user = email;
      localStorage.setItem("usuario", JSON.stringify(usuario));

    } else {
      alert(data.message || "Erro ao atualizar perfil.");
    }
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    alert("Erro ao conectar ao servidor.");
  }
}

/**
 * Abre o modal de edição de perfil e preenche os dados do usuário.
 */
function abrirModalPerfil() {
  preencherCamposPerfil();
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "block";
}

/**
 * Fecha o modal de edição de perfil.
 */
function fecharModalPerfil() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "none";
}
