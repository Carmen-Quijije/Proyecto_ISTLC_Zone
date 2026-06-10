const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
  window.location.href = "index.html";
}

document.getElementById("nombrePerfil").textContent = usuario.nombreCompleto || "Usuario";
document.getElementById("bioPerfil").textContent = usuario.biografia || "Bienvenido a mi perfil de ISTLC Zone.";

document.getElementById("detalleViveEn").textContent = usuario.viveEn || "No registrado";
document.getElementById("detalleCarrera").textContent = usuario.carrera || "No registrado";
document.getElementById("detalleSemestre").textContent = usuario.semestre || "No registrado";

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

function cargarFotos() {
  const listaFotos = document.getElementById("listaFotos");
  const publicaciones = JSON.parse(localStorage.getItem("publicaciones")) || [];

  const fotosUsuario = publicaciones.filter((pub) => {
    return pub.idUsuario === usuario.idUsuario && (pub.imagen || pub.imagenes);
  });

  if (fotosUsuario.length === 0) {
    listaFotos.innerHTML = `<p class="text-muted">Aún no has subido fotos.</p>`;
    return;
  }

  listaFotos.innerHTML = "";

  fotosUsuario.forEach((pub) => {
    if (pub.imagen) {
      listaFotos.innerHTML += crearFoto(pub.imagen, pub.fecha);
    }

    if (pub.imagenes && Array.isArray(pub.imagenes)) {
      pub.imagenes.forEach((img) => {
        listaFotos.innerHTML += crearFoto(img, pub.fecha);
      });
    }
  });
}

function crearFoto(imagen, fecha) {
  return `
    <div class="foto-card">
      <img src="${imagen}" alt="Foto subida">
      <small>${fecha || "Sin fecha"}</small>
    </div>
  `;
}

function cerrarSesion() {
  localStorage.removeItem("usuarioLogueado");
  window.location.href = "index.html";
}

cargarContadores();
cargarFotos();