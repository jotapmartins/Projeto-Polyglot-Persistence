document.getElementById("cadastroForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome_user = document.getElementById("nome").value.trim();
  const email_user = document.getElementById("email").value.trim();
  const cpf_user = document.getElementById("cpf").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmar = document.getElementById("confirmar").value;

  if (!nome_user || !email_user || !cpf_user || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  if (senha !== confirmar) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5521/cadastrarUsuario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome_user, email_user, cpf_user, senha })
    });

    const data = await res.json();

    if (res.ok) {
      const notif = document.getElementById("notificacao");
      notif.style.display = "block";
      notif.textContent = "✅ " + data.message;
      setTimeout(() => notif.style.display = "none", 3000);

      document.getElementById("cadastroForm").reset();
      setTimeout(() => window.location.href = "/public/index.html", 1200);
    } else {
      alert("❌ " + data.message);
    }
  } catch (error) {
    alert("Erro ao cadastrar. Tente novamente mais tarde.");
    console.error("Erro:", error);
  }
});