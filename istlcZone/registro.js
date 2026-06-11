let emailRegistrado = "";
let modalConfirmacion = null;
let registroEnCurso = false;

document.addEventListener("DOMContentLoaded", () => {
    modalConfirmacion = new bootstrap.Modal(
        document.getElementById("modalConfirmacion")
    );

    const inputUsuario = document.getElementById("usuario");
    if (inputUsuario) {
        inputUsuario.addEventListener("input", () => {
            inputUsuario.value = inputUsuario.value
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "");
        });
    }
});

function handleCredentialResponse(response) {
    console.log("Token recibido:", response.credential);

    fetch("/api/auth/google-signin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: response.credential
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Cuenta creada correctamente");
            window.location.href = "index.html";
        }
    })
    .catch(error => console.error(error));
}

document.getElementById("registroForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    if (registroEnCurso) {
        return;
    }

    const botonRegistro = this.querySelector('button[type="submit"]');
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const usuario = document.getElementById("usuario").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const privacidad = document.getElementById("privacidad").checked;

    if (password !== passwordConfirm) {
        alert("Las contrasenas no coinciden");
        return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(usuario)) {
        alert("El usuario debe tener entre 3 y 30 caracteres. Usa letras, numeros, guion o guion bajo.");
        return;
    }

    const activarBoton = () => {
        registroEnCurso = false;
        botonRegistro.disabled = false;
        botonRegistro.innerHTML = '<i class="fas fa-user-plus"></i> Crear cuenta';
    };

    try {
        registroEnCurso = true;
        botonRegistro.disabled = true;
        botonRegistro.textContent = "Creando cuenta...";

        const respuesta = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre,
                email,
                usuario,
                password,
                privacidad
            })
        });

        const contentType = respuesta.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await respuesta.json()
            : { message: "El servidor no respondio correctamente. Revisa si Render termino el deploy." };

        if (!respuesta.ok || !data.success) {
            activarBoton();
            alert(data.message || "No se pudo registrar el usuario");
            return;
        }

        emailRegistrado = email;
        document.getElementById("emailConfirmacion").textContent = email;
        document.getElementById("codigoConfirmacion").value = "";
        document.getElementById("mensajeError").classList.add("d-none");
        document.getElementById("mensajeExito").classList.add("d-none");
        modalConfirmacion.show();
    } catch (error) {
        console.error(error);
        activarBoton();
        alert("No se pudo conectar con la API. Revisa que Render este en estado Live.");
    } finally {
        if (registroEnCurso) {
            activarBoton();
        }
    }
});

document.getElementById("btnConfirmar").addEventListener("click", async function() {
    const codigo = document.getElementById("codigoConfirmacion").value.trim();

    if (codigo.length !== 6 || !/^\d+$/.test(codigo)) {
        mostrarError("Ingresa un codigo valido");
        return;
    }

    try {
        const respuesta = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailRegistrado,
                codigo
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            mostrarError(data.message || "Codigo invalido");
            return;
        }

        mostrarExito("Correo confirmado correctamente");

        setTimeout(() => {
            modalConfirmacion.hide();
            window.location.href = "index.html";
        }, 1500);
    } catch (error) {
        console.error(error);
        mostrarError("No se pudo conectar con la API");
    }
});

document.getElementById("btnReenviar").addEventListener("click", async function() {
    try {
        const respuesta = await fetch("/api/auth/resend-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailRegistrado
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            mostrarError(data.message || "No se pudo reenviar el codigo");
            return;
        }

        mostrarExito("Codigo reenviado");
    } catch (error) {
        console.error(error);
        mostrarError("No se pudo conectar con la API");
    }
});

document.getElementById("codigoConfirmacion").addEventListener("input", function() {
    this.value = this.value.replace(/[^0-9]/g, "");
});

function mostrarError(mensaje) {
    document.getElementById("textoError").textContent = mensaje;
    document.getElementById("mensajeError").classList.remove("d-none");
    document.getElementById("mensajeExito").classList.add("d-none");
}

function mostrarExito(mensaje) {
    document.getElementById("textoExito").textContent = mensaje;
    document.getElementById("mensajeExito").classList.remove("d-none");
    document.getElementById("mensajeError").classList.add("d-none");
}
