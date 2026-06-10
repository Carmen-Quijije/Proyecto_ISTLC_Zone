const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
  window.location.href = "index.html";
}

const listaCumpleaños = document.getElementById("listaCumpleaños");

async function cargarCumpleaños() {
  try {
    const respuesta = await fetch("http://localhost:8085/api/usuarios");
    const usuarios = await respuesta.json();

    const usuariosConFecha = usuarios
      .filter((u) => u.fechaNacimiento)
      .sort((a, b) => diasHastaCumpleaños(a.fechaNacimiento) - diasHastaCumpleaños(b.fechaNacimiento));

    if (usuariosConFecha.length === 0) {
      listaCumpleaños.innerHTML = `<p class="text-muted">No hay cumpleaños registrados.</p>`;
      return;
    }

    listaCumpleaños.innerHTML = "";

    usuariosConFecha.forEach((u) => {
      listaCumpleaños.innerHTML += `
        <div class="cumple-card">
          <img src="${u.fotoPerfil || "images/icono.png"}" alt="Foto usuario">

          <div>
            <h5>${u.nombreCompleto}</h5>
            <p>Fecha de cumpleaños: ${formatearFecha(u.fechaNacimiento)}</p>
            <small>Faltan ${diasHastaCumpleaños(u.fechaNacimiento)} días</small>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error(error);
    listaCumpleaños.innerHTML = `<p class="text-danger">No se pudieron cargar los cumpleaños.</p>`;
  }
}

function diasHastaCumpleaños(fechaNacimiento) {
  const hoy = new Date();
  const fecha = new Date(fechaNacimiento);

  let cumple = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate());

  if (cumple < hoy) {
    cumple.setFullYear(hoy.getFullYear() + 1);
  }

  return Math.ceil((cumple - hoy) / (1000 * 60 * 60 * 24));
}

function formatearFecha(fecha) {
  const fechaObj = new Date(fecha);
  return fechaObj.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long"
  });
}

function cerrarSesion() {
  localStorage.removeItem("usuarioLogueado");
  window.location.href = "index.html";
}

cargarCumpleaños();