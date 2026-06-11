const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuarioLogueado) {
    window.location.href = "index.html";
}

const parametros = new URLSearchParams(window.location.search);
const idPerfil = parametros.get("id") || usuarioLogueado.id;

let usuario = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarLinksPerfil();
    await cargarPerfilVisto();
    await cargarFotosUsuario();
});

function configurarLinksPerfil() {
    document.getElementById("linkTodo").href = `perfil.html?id=${idPerfil}`;
    document.getElementById("linkInformacion").href = `informacion.html?id=${idPerfil}`;
    document.getElementById("linkFotos").href = `fotos.html?id=${idPerfil}`;
    document.getElementById("linkAmigos").href = `amigos.html?id=${idPerfil}`;
    document.getElementById("linkCumpleanos").href = `cumpleaños.html?id=${idPerfil}`;
}

async function cargarPerfilVisto() {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${idPerfil}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error("No se pudo cargar el perfil");
        }

        usuario = data.usuario;
        usuario.seguidores = data.seguidores;
        usuario.seguidos = data.seguidos;

        cargarDatosCabecera();

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar el perfil.");
    }
}

function cargarDatosCabecera() {
    document.getElementById("fotoPerfil").src =
        usuario.fotoPerfil || "images/icono.png";

    document.getElementById("nombrePerfil").textContent =
        usuario.nombre || "Usuario";

    document.getElementById("contadorSeguidores").textContent =
        `${usuario.seguidores || 0} seguidores - ${usuario.seguidos || 0} seguidos`;

    document.getElementById("bioPerfil").textContent =
        usuario.bio || "Bienvenido a mi perfil de ISTLC Zone.";

    document.getElementById("detalleViveEn").textContent =
        usuario.viveEn || "No registrado";

    document.getElementById("detalleCarrera").textContent =
        usuario.carrera || "No registrado";

    document.getElementById("detalleSemestre").textContent =
        usuario.semestre || "No registrado";
    
    document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
}

async function cargarFotosUsuario() {
    const contenedor = document.getElementById("listaFotos");

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/feed/${usuarioLogueado.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error("No se pudieron cargar las publicaciones");
        }

        const publicaciones = data.publicaciones || [];
        const fotos = [];

        publicaciones.forEach((publicacion) => {
            const autor = publicacion.autor || {};

            if (Number(autor.id) !== Number(idPerfil)) {
                return;
            }

            const fecha = publicacion.fecha
                ? new Date(publicacion.fecha)
                : new Date();

            const fechaClave = fecha.toISOString().split("T")[0];

            const fechaTexto = fecha.toLocaleDateString("es-EC", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });

            if (Array.isArray(publicacion.imagenes) && publicacion.imagenes.length) {
                publicacion.imagenes.forEach((imagen) => {
                    fotos.push({
                        imagen,
                        fechaClave,
                        fechaTexto
                    });
                });
            }

            if (publicacion.imagenUrl) {
                fotos.push({
                    imagen: publicacion.imagenUrl,
                    fechaClave,
                    fechaTexto
                });
            }
        });

        if (!fotos.length) {
            contenedor.innerHTML = `
                <p class="text-muted">
                    Este usuario aún no ha subido fotos.
                </p>
            `;
            return;
        }

        const fotosPorFecha = agruparFotosPorFecha(fotos);

        contenedor.innerHTML = Object.keys(fotosPorFecha)
            .sort((a, b) => new Date(b) - new Date(a))
            .map((fechaClave) => {
                const grupo = fotosPorFecha[fechaClave];

                return `
                    <div class="card shadow-sm p-3 mb-4">
                        <h5 class="mb-3">
                            Fotos subidas el ${grupo.fechaTexto}
                        </h5>

                        <div class="fotos-grid">
                            ${grupo.fotos.map((foto) => `
                                <div class="foto-card">
                                    <img src="${foto.imagen}" alt="Foto subida">
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `;
            })
            .join("");

    } catch (error) {
        console.error("Error cargando fotos:", error);

        contenedor.innerHTML = `
            <p class="text-danger">
                No se pudieron cargar las fotos.
            </p>
        `;
    }
}

function agruparFotosPorFecha(fotos) {
    return fotos.reduce((grupos, foto) => {
        if (!grupos[foto.fechaClave]) {
            grupos[foto.fechaClave] = {
                fechaTexto: foto.fechaTexto,
                fotos: []
            };
        }

        grupos[foto.fechaClave].fotos.push(foto);

        return grupos;
    }, {});
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}