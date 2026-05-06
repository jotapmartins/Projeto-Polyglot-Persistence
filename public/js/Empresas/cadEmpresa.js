document.addEventListener('DOMContentLoaded', () => {

  // --- 1. LÓGICA DE BUSCA DE CEP (Mantida) ---
  const cepInput = document.getElementById('cep');
  
  cepInput.addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, ''); 
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('CEP não encontrado');
      
      const data = await response.json();
      if (data.erro) {
        alert('CEP não localizado.');
        return;
      }
      document.getElementById('logradouro').value = data.logradouro;
      document.getElementById('bairro').value = data.bairro;
      document.getElementById('cidade').value = data.localidade;
      document.getElementById('estado').value = data.uf;
      document.getElementById('numero').focus();
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Não foi possível buscar o CEP.');
    }
  });


  // --- 2. LÓGICA DE ENVIO DO FORMULÁRIO (Modificada) ---
  const form = document.getElementById('empresaForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previne o envio padrão

    // --- MUDANÇA PRINCIPAL AQUI ---
    // 1. Pegar o usuário logado do localStorage
    const usuarioString = localStorage.getItem('usuario');
    if (!usuarioString) {
      alert('Você precisa estar logado para cadastrar uma empresa.');
      window.location.href = '/public/login.html'; // Redireciona para o login
      return;
    }
    
    const usuarioLogado = JSON.parse(usuarioString);
    const codColaborador = usuarioLogado.cod_user; // Pega o ID

    if (!codColaborador) {
        alert('Erro ao identificar seu usuário. Faça login novamente.');
        localStorage.removeItem('usuario');
        window.location.href = '/public/login.html';
        return;
    }

    // 2. Coleta os dados do formulário
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // 3. Adiciona o código do colaborador aos dados que serão enviados
    data.cod_colaborador = codColaborador;
    
    // O JS não precisa mais validar senha

    try {
      // 4. Envia os dados (incluindo o cod_colaborador) para o backend
      const resposta = await fetch('http://localhost:5521/cadastrar-empresa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data) // Envia o JSON completo
      });

      const resultado = await resposta.json();

     if (resposta.ok) {
        alert(resultado.message);
        if (resultado.empresaId) {
          const usuario = JSON.parse(localStorage.getItem('usuario')) || {};
          usuario.cod_empresa = resultado.empresaId;
          localStorage.setItem('usuario', JSON.stringify(usuario));
        }
        window.location.href = '/public/telainicial.html'; 
      } else {
        alert(resultado.message);
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      alert('Erro de conexão. Tente novamente.');
    }
  });
});