const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    cargarDatosUsuario(usuario);
    await cargarPerfilActualizado();
    await cargarAmigosPerfil();
});

async function cargarPerfilActualizado() {
    if (!usuario?.id) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${usuario.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            return;
        }

        usuario = data.usuario;
        usuario.seguidores = data.seguidores;
        usuario.seguidos = data.seguidos;
        localStorage.setItem("usuarioLogueado", JSON.stringify(usuario));
        cargarDatosUsuario(usuario);
        cargarContadores(data.seguidores, data.seguidos);
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
    }
}

function texto(valor) {
    return valor && String(valor).trim() ? valor : "No registrado";
}

function ponerTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function ponerImagen(selector, src) {
    document.querySelectorAll(selector).forEach((imagen) => {
        imagen.src = src || "images/icono.png";
    });
}

function cargarDatosUsuario(datosUsuario) {
    const nombreUsuario =
        datosUsuario?.nombre ||
        datosUsuario?.nombreCompleto ||
        datosUsuario?.usuario ||
        "Usuario";

    ponerTexto("nombrePerfil", nombreUsuario);
    ponerTexto("nombrePost", nombreUsuario);
    ponerTexto("detalleViveEn", texto(datosUsuario?.viveEn));
    ponerTexto("detalleCarrera", texto(datosUsuario?.carrera));
    ponerTexto("detalleSemestre", texto(datosUsuario?.semestre));
    ponerTexto("viveEn", texto(datosUsuario?.viveEn));
    ponerTexto("lugarOrigen", texto(datosUsuario?.lugarOrigen));
    ponerTexto("fechaNacimiento", texto(datosUsuario?.fechaNacimiento));
    ponerTexto("estadoCivil", texto(datosUsuario?.estadoCivil));
    ponerTexto("carrera", texto(datosUsuario?.carrera));
    ponerTexto("semestre", texto(datosUsuario?.semestre));

    const bio = datosUsuario?.bio || "Bienvenido a mi perfil de ISTLC Zone.";
    ponerTexto("bioPerfil", bio);

    ponerImagen("#fotoPerfil, .foto-usuario", datosUsuario?.fotoPerfil);
}

function cargarContadores(seguidores = usuario?.seguidores || 0, seguidos = usuario?.seguidos || 0) {
    ponerTexto("contadorSeguidores", `${seguidores} seguidores - ${seguidos} seguidos`);
    ponerTexto("contadorAmigos", `${seguidos} amigos`);
}

async function cargarAmigosPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const contadorAmigos = document.getElementById("contadorAmigos");

    if (!listaAmigos || !usuario?.id) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/following/${usuario.id}`);
        const data = await respuesta.json();
        const amigos = data.success ? data.usuarios : [];

        if (contadorAmigos) {
            contadorAmigos.textContent = `${amigos.length} amigos`;
        }

        if (!amigos.length) {
            listaAmigos.innerHTML = `
                <div class="col-12">
                    <p class="text-muted mb-2">Aun no tienes amigos agregados.</p>
                    <a href="amigos.html" class="btn btn-warning w-100">Buscar amigos</a>
                </div>
            `;
            return;
        }

        listaAmigos.innerHTML = amigos
            .map((amigo) => `
                <div class="col-6">
                    <div class="amigo-mini">
                        <img src="${amigo.fotoPerfil || "images/icono.png"}" alt="${amigo.nombre}">
                        <strong>${amigo.nombre}</strong>
                    </div>
                </div>
            `)
            .join("");
    } catch (error) {
        console.error("No se pudieron cargar amigos:", error);
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
