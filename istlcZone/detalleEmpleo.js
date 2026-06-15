const empleo = JSON.parse(localStorage.getItem("empleoSeleccionado"));
const contenedor = document.getElementById("detalleEmpleo");

function limpiarTitulo(titulo) {
    if (!titulo) return "Vacante disponible";

    return titulo
        .replace(/\s*-\s*m\/f\/d/gi, "")
        .replace(/\s*-\s*m\/w\/d/gi, "")
        .replace(/\s*\(m\/f\/d\)/gi, "")
        .replace(/\s*\(m\/w\/d\)/gi, "")
        .replace(/m\/f\/d/gi, "")
        .replace(/m\/w\/d/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

if (!empleo) {
    contenedor.innerHTML = `
        <h3>No se encontro la vacante</h3>

        <p class="text-muted">
            Regresa a la bolsa de empleos y selecciona una oferta.
        </p>

        <a href="empleos.html" class="btn btn-warning">
            Volver a bolsa de empleos
        </a>
    `;
} else {
    const fecha = new Date(empleo.created_at * 1000).toLocaleDateString(
        "es-EC",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }
    );

    contenedor.innerHTML = `
        <h2 class="mb-3">
            ${limpiarTitulo(empleo.title)}
        </h2>

        <p>
            <strong>Empresa:</strong>
            ${empleo.company_name || "No disponible"}
        </p>

        <p>
            <strong>Lugar:</strong>
            ${empleo.location || "No especificado"}
        </p>

        <p>
            <strong>Fecha de publicacion:</strong>
            ${fecha}
        </p>

        <hr>

        <h4>Detalle de la vacante</h4>

        <div class="empleo-descripcion">
            ${empleo.description || "No hay descripcion disponible."}
        </div>

        <div class="mt-4 d-flex gap-2 flex-wrap">
            <a href="empleos.html" class="btn btn-light">
                Volver a bolsa de empleos
            </a>

            <a
                href="${empleo.url || "#"}"
                target="_blank"
                class="btn btn-warning fw-bold"
            >
                Ver oferta original
            </a>
        </div>
    `;
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}

