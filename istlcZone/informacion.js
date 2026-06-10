const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
  window.location.href = "index.html";
}

document.getElementById("nombrePerfil").textContent = usuario.nombreCompleto || "Usuario";
document.getElementById("bioPerfil").textContent = usuario.biografia || "Bienvenido a mi perfil de ISTLC Zone.";

document.getElementById("detalleViveEn").textContent = usuario.viveEn || "No registrado";
document.getElementById("detalleCarrera").textContent = usuario.carrera || "No registrado";
document.getElementById("detalleSemestre").textContent = usuario.semestre || "No registrado";

document.getElementById("viveEn").textContent = usuario.viveEn || "No registrado";
document.getElementById("lugarOrigen").textContent = usuario.lugarOrigen || "No registrado";
document.getElementById("fechaNacimiento").textContent = usuario.fechaNacimiento || "No registrado";
document.getElementById("estadoCivil").textContent = usuario.estadoCivil || "No registrado";
document.getElementById("carrera").textContent = usuario.carrera || "No registrado";
document.getElementById("semestre").textContent = usuario.semestre || "No registrado";

if (usuario.fotoPerfil) {
  document.getElementById("fotoPerfil").src = usuario.fotoPerfil;
}

async function cargarContadores() {
  try {
    const seguidosRes = await fetch(`http://localhost:8085/api/seguidores/seguidos/${usuario.idUsuario}`);
    const seguidoresRes = await fetch(`http://localhost:8085/api/seguidores/seguidores/${usuario.idUsuario}`);

    const seguidos = await seguidosRes.json();
    const seguidores = await seguidoresRes.json();

    document.getElementById("contadorSeguidores").textContent =
      `${seguidores.length} seguidores - ${seguidos.length} seguidos`;
  } catch (error) {
    console.error(error);
  }
}

function cerrarSesion() {
  localStorage.removeItem("usuarioLogueado");
  window.location.href = "index.html";
}

cargarContadores();