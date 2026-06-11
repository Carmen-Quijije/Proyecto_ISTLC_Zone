const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

const listaCumpleaños = document.getElementById("listaCumpleaños");

document.addEventListener("DOMContentLoaded", () => {
    cargarCumpleañosAmigos();
});

async function cargarCumpleañosAmigos() {
    listaCumpleaños.innerHTML = `
        <p class="text-muted">Cargando cumpleaños...</p>
    `;

    try {
        const respuesta = await fetch(
            `${API_BASE}/api/auth/users?q=&currentUserId=${usuario.id}`
        );

        const data = await respuesta.json();

        console.log("Usuarios recibidos:", data);

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudieron cargar los usuarios");
        }

        const amigos = data.usuarios
            .filter((persona) => persona.siguiendo === true)
            .filter((persona) => persona.fechaNacimiento);

        if (!amigos.length) {
            listaCumpleaños.innerHTML = `
                <p class="text-muted">
                    Tus amigos aún no tienen fecha de cumpleaños registrada.
                </p>
            `;
            return;
        }

        amigos.sort((a, b) => {
            return diasHastaCumpleaños(a.fechaNacimiento) -
                   diasHastaCumpleaños(b.fechaNacimiento);
        });

        listaCumpleaños.innerHTML = amigos.map(tarjetaCumpleaños).join("");

    } catch (error) {
        console.error("Error cargando cumpleaños:", error);

        listaCumpleaños.innerHTML = `
            <p class="text-danger">
                No se pudieron cargar los cumpleaños.
            </p>
        `;
    }
}

function tarjetaCumpleaños(persona) {
    return `
        <div class="cumple-card">
            <img
                src="${persona.fotoPerfil || "images/icono.png"}"
                alt="${persona.nombre || "Usuario"}"
            >

            <div class="flex-grow-1">
                <h5>${persona.nombre || "Usuario"}</h5>

                <p class="mb-1">
                    Cumpleaños: ${formatearFecha(persona.fechaNacimiento)}
                </p>

                <small>
                    Faltan ${diasHastaCumpleaños(persona.fechaNacimiento)} días
                </small>
            </div>

            <a
                href="perfil.html?id=${persona.id}"
                class="btn btn-warning btn-sm">
                Ver perfil
            </a>
        </div>
    `;
}

function diasHastaCumpleaños(fechaNacimiento) {
    const fechaTexto = fechaNacimiento.substring(0, 10);
    const partes = fechaTexto.split("-");

    const hoy = new Date();
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    let proximoCumple = new Date(hoy.getFullYear(), mes, dia);

    if (proximoCumple < hoy) {
        proximoCumple.setFullYear(hoy.getFullYear() + 1);
    }

    const diferencia = proximoCumple - hoy;

    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

function formatearFecha(fechaNacimiento) {
    const fechaTexto = fechaNacimiento.substring(0, 10);
    const partes = fechaTexto.split("-");

    const fecha = new Date(
        2026,
        parseInt(partes[1], 10) - 1,
        parseInt(partes[2], 10)
    );

    return fecha.toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "long"
    });
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}