document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();

  if (!email || !senha) {
  alert("Preencha todos os campos")
    return;
  }

  try {
    const resposta = await fetch('http://localhost:5521/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_user: email, senha })
    });

    const data = await resposta.json();

    if (resposta.ok) {
     
      localStorage.setItem('usuario', JSON.stringify(data.user));
        window.location.href = '/public/telainicial.html';

    } else {
    alert("Login incorreto, revise as informações")
    }
  } catch (error) {
    console.error('Erro:', error);
    mensagem.textContent = 'Erro ao conectar com o servidor.';
    mensagem.style.color = 'red';
  }
});
