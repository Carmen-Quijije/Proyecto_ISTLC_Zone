const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosUsuario();
    cargarContadores();
    cargarAmigosPerfil();
});

function cargarDatosUsuario() {
    document.getElementById("nombrePerfil").textContent =
        usuario.nombreCompleto;

    document.getElementById("nombrePost").textContent =
        usuario.nombreCompleto;

    document.getElementById("detalleViveEn").textContent =
        usuario.viveEn || "No registrado";

    document.getElementById("detalleCarrera").textContent =
        usuario.carrera || "No registrado";

    document.getElementById("detalleSemestre").textContent =
        usuario.semestre || "No registrado";

    document.getElementById("viveEn").textContent =
        usuario.viveEn || "No registrado";

    document.getElementById("lugarOrigen").textContent =
        usuario.lugarOrigen || "No registrado";

    document.getElementById("fechaNacimiento").textContent =
        usuario.fechaNacimiento || "No registrado";

    document.getElementById("estadoCivil").textContent =
        usuario.estadoCivil || "No registrado";

    document.getElementById("carrera").textContent =
        usuario.carrera || "No registrado";

    document.getElementById("semestre").textContent =
        usuario.semestre || "No registrado";

    if (usuario.fotoPerfil) {
        document.getElementById("fotoPerfil").src = usuario.fotoPerfil;
    }
}

async function cargarContadores() {
    try {
        const respuestaSeguidos = await fetch(
            `http://localhost:8085/api/seguidores/seguidos/${usuario.idUsuario}`
        );

        const respuestaSeguidores = await fetch(
            `http://localhost:8085/api/seguidores/seguidores/${usuario.idUsuario}`
        );

        const seguidos = await respuestaSeguidos.json();
        const seguidores = await respuestaSeguidores.json();

        document.getElementById("contadorSeguidores").textContent =
            seguidores.length + " seguidores • " +
            seguidos.length + " seguidos";

    } catch (error) {
        console.error("Error cargando contadores", error);
    }
}

async function cargarAmigosPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const contadorAmigos = document.getElementById("contadorAmigos");

    try {
        const respuesta = await fetch(
            `http://localhost:8085/api/seguidores/seguidos/${usuario.idUsuario}`
        );

        const seguidos = await respuesta.json();

        contadorAmigos.textContent = seguidos.length + " amigos";

        listaAmigos.innerHTML = "";

        if (seguidos.length === 0) {
            listaAmigos.innerHTML = `
                <div class="col-12">
                    <p class="text-muted mb-2">
                        Aún no tienes amigos agregados.
                    </p>

                    <a href="amigos.html" class="btn btn-warning w-100">
                        Buscar amigos
                    </a>
                </div>
            `;
            return;
        }

        seguidos.forEach((item) => {
            const amigo = item.usuarioSeguido;

            listaAmigos.innerHTML += `
                <div class="col-4 text-center">
                    <img
                        src="${amigo.fotoPerfil ? amigo.fotoPerfil : "images/icono.png"}"
                        class="img-amigo"
                        alt="Foto amigo">

                    <small>${amigo.nombreCompleto}</small>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error cargando amigos", error);

        listaAmigos.innerHTML = `
            <div class="col-12">
                <p class="text-danger">
                    No se pudieron cargar los amigos.
                </p>
            </div>
        `;
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}