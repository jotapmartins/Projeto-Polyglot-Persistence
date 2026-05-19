
document.addEventListener("DOMContentLoaded",function(){
  if(!localStorage.getItem("usuario")){
    alert("Login vencido");
    window.location.href = '/public/index.html';
    return;
  }
})