document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("loginForm");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("correo").value.trim();
        const password = document.getElementById("contrasena").value;

        try {
            const respuesta = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await respuesta.json();

            if (!respuesta.ok || !data.success) {
                alert(data.message || "Correo o contrasena incorrectos");
                return;
            }

            localStorage.setItem("usuarioLogueado", JSON.stringify(data.usuario));
            window.location.href = "muro.html";
        } catch (error) {
            console.error(error);
            alert("No se pudo conectar con la API");
        }
    });
});
