const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const formSolicitarCodigo = document.getElementById("formSolicitarCodigo");
const formCambiarPassword = document.getElementById("formCambiarPassword");
const btnEnviarCodigo = document.getElementById("btnEnviarCodigo");
const btnCambiarPassword = document.getElementById("btnCambiarPassword");

formSolicitarCodigo.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    btnEnviarCodigo.disabled = true;
    btnEnviarCodigo.textContent = "Enviando...";

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar el codigo");
        }

        alert("Codigo enviado. Revisa tu correo.");
        formCambiarPassword.classList.remove("d-none");
    } catch (error) {
        alert(error.message);
    } finally {
        btnEnviarCodigo.disabled = false;
        btnEnviarCodigo.textContent = "Enviar codigo";
    }
});

formCambiarPassword.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const codigo = document.getElementById("codigo").value.trim();
    const password = document.getElementById("password").value;
    const confirmarPassword = document.getElementById("confirmarPassword").value;

    if (password !== confirmarPassword) {
        alert("Las contraseñas no coinciden");
        return;
    }

    btnCambiarPassword.disabled = true;
    btnCambiarPassword.textContent = "Cambiando...";

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, codigo, password })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo cambiar la contraseña");
        }

        alert("Contraseña actualizada. Ya puedes iniciar sesion.");
        window.location.href = "index.html";
    } catch (error) {
        alert(error.message);
    } finally {
        btnCambiarPassword.disabled = false;
        btnCambiarPassword.textContent = "Cambiar contraseña";
    }
});
