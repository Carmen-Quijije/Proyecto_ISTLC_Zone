// Variables globales
let emailRegistrado = "";
let modalConfirmacion = null;

// Inicializar modal
document.addEventListener("DOMContentLoaded", function () {
    modalConfirmacion = new bootstrap.Modal(
        document.getElementById("modalConfirmacion")
    );
});

// Manejar respuesta de Google
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

        if(data.success){
            alert("¡Cuenta creada correctamente!");
            window.location.href = "index.html";
        }

    })
    .catch(error => console.error(error));
}

// Registro
document.getElementById("registroForm")
.addEventListener("submit", async function(e){

    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const passwordConfirm =
        document.getElementById("passwordConfirm").value;

    if(password !== passwordConfirm){
        alert("Las contraseñas no coinciden");
        return;
    }

    try{

        const respuesta = await fetch(
            "http://localhost:8085/api/usuarios",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body: JSON.stringify({
                    nombreCompleto:nombre,
                    correo:email,
                    contrasena:password
                })
            }
        );

        if(!respuesta.ok){
            throw new Error("Error al registrar");
        }

        alert("Usuario registrado correctamente");

        window.location.href = "index.html";

    }
    catch(error){

        console.error(error);
        alert("No se pudo registrar el usuario");

    }

});

// Confirmar código
document.getElementById("btnConfirmar")
.addEventListener("click", function(){

    const codigo =
        document.getElementById("codigoConfirmacion").value;

    if(codigo.length !== 6){
        mostrarError("Ingresa un código válido");
        return;
    }

    mostrarExito("Código confirmado");

    setTimeout(() => {

        modalConfirmacion.hide();
        window.location.href = "index.html";

    }, 1500);

});

// Reenviar código
document.getElementById("btnReenviar")
.addEventListener("click", function(){

    mostrarExito("Código reenviado");

});

// Solo números
document.getElementById("codigoConfirmacion")
.addEventListener("input", function(){

    this.value =
        this.value.replace(/[^0-9]/g,"");

});

// Mostrar error
function mostrarError(mensaje){

    const errorDiv =
        document.getElementById("mensajeError");

    document.getElementById("textoError")
        .textContent = mensaje;

    errorDiv.classList.remove("d-none");

    document.getElementById("mensajeExito")
        .classList.add("d-none");
}

// Mostrar éxito
function mostrarExito(mensaje){

    const exitoDiv =
        document.getElementById("mensajeExito");

    document.getElementById("textoExito")
        .textContent = mensaje;

    exitoDiv.classList.remove("d-none");

    document.getElementById("mensajeError")
        .classList.add("d-none");
}