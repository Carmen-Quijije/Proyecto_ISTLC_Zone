document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("loginForm");

    formulario.addEventListener("submit", async (e) => {

        e.preventDefault();

        const correo = document.getElementById("correo").value;
        const contrasena = document.getElementById("contrasena").value;

        try {

            const respuesta = await fetch("http://localhost:8085/api/usuarios");

            const usuarios = await respuesta.json();

            const usuario = usuarios.find(
                u => u.correo === correo &&
                u.contrasena === contrasena
            );

            if(usuario){

                localStorage.setItem(
                    "usuarioLogueado",
                    JSON.stringify(usuario)
                );

                window.location.href = "muro.html";

            }else{

                alert("Correo o contraseña incorrectos");

            }

        } catch(error){

            console.error(error);

            alert("No se pudo conectar con la API");

        }
        
        

    });

});