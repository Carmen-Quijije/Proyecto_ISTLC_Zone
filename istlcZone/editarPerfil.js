const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

const campos = [
    "nombre",
    "fotoPerfil",
    "viveEn",
    "lugarOrigen",
    "fechaNacimiento",
    "estadoCivil",
    "carrera",
    "semestre",
    "bio"
];

document.addEventListener("DOMContentLoaded", () => {
    rellenarFormulario();
    document.getElementById("fotoPerfil").addEventListener("input", actualizarVistaFoto);
    document.getElementById("formEditarPerfil").addEventListener("submit", guardarPerfil);
});

function rellenarFormulario() {
    campos.forEach((campo) => {
        const input = document.getElementById(campo);
        if (input) {
            input.value = usuario[campo] || "";
        }
    });

    actualizarVistaFoto();
}

function actualizarVistaFoto() {
    const foto = document.getElementById("fotoPerfil").value || usuario.fotoPerfil || "images/icono.png";
    document.getElementById("previewFoto").src = foto;
}

async function guardarPerfil(evento) {
    evento.preventDefault();

    const boton = document.getElementById("btnGuardar");
    boton.disabled = true;
    boton.textContent = "Guardando...";

    const datos = { id: usuario.id };
    campos.forEach((campo) => {
        datos[campo] = document.getElementById(campo).value.trim();
    });

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo guardar");
        }

        localStorage.setItem("usuarioLogueado", JSON.stringify(data.usuario));
        alert("Perfil actualizado correctamente");
        window.location.href = "muro.html";
    } catch (error) {
        alert(error.message);
        boton.disabled = false;
        boton.textContent = "Guardar cambios";
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
