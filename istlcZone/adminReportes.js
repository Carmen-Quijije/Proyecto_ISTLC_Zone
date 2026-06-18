const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!esAdminLocal()) {
        document.getElementById("listaReportes").innerHTML = `
            <div class="alert alert-warning mb-0">
                No tienes permisos para revisar reportes.
            </div>
        `;
        return;
    }

    await cargarReportes();
});

function esAdminLocal() {
    return usuario?.rol === "admin" || usuario?.usuario === "admin";
}

async function cargarReportes() {
    const contenedor = document.getElementById("listaReportes");
    contenedor.innerHTML = `<p class="text-muted mb-0">Cargando reportes...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/reports?usuarioId=${usuario.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudieron cargar reportes");
        }

        const reportes = data.reportes || [];

        if (!reportes.length) {
            contenedor.innerHTML = `<p class="text-muted mb-0">No hay reportes por revisar.</p>`;
            return;
        }

        contenedor.innerHTML = reportes.map(tarjetaReporte).join("");
    } catch (error) {
        contenedor.innerHTML = `
            <div class="alert alert-danger mb-0">${escaparHtml(error.message)}</div>
        `;
    }
}

function tarjetaReporte(reporte) {
    const destino = obtenerDestinoReporte(reporte);
    const detalle = obtenerDetalleReporte(reporte);
    const fecha = reporte.fecha
        ? new Date(reporte.fecha).toLocaleString("es-EC")
        : "Sin fecha";

    return `
        <article class="reporte-admin-card ${reporte.estado}">
            <div>
                <span class="reporte-admin-tipo">${escaparHtml(reporte.tipo)}</span>
                <strong>${escaparHtml(detalle)}</strong>
                <p>${escaparHtml(reporte.motivo)}</p>
                <small>
                    Reportado por ${escaparHtml(reporte.reportante?.nombre || "Usuario")}
                    (@${escaparHtml(reporte.reportante?.usuario || "")}) · ${fecha}
                </small>
            </div>
            <div class="reporte-admin-acciones">
                <span class="reporte-admin-estado">${escaparHtml(reporte.estado)}</span>
                <a class="btn btn-sm btn-light" href="${destino}">Abrir</a>
                <button class="btn btn-sm btn-warning" onclick="actualizarReporte(${reporte.id}, 'revisado')">
                    Revisado
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="actualizarReporte(${reporte.id}, 'descartado')">
                    Descartar
                </button>
            </div>
        </article>
    `;
}

function obtenerDetalleReporte(reporte) {
    if (reporte.tipo === "perfil") {
        return `Perfil: ${reporte.objetivo?.perfil || reporte.referenciaId}`;
    }

    if (reporte.tipo === "comentario") {
        return `Comentario de ${reporte.objetivo?.comentarioAutor || "usuario"}: ${reporte.objetivo?.comentario || ""}`;
    }

    return `Publicacion: ${reporte.objetivo?.publicacion || reporte.referenciaId}`;
}

function obtenerDestinoReporte(reporte) {
    if (reporte.tipo === "perfil") {
        return `perfil.html?id=${reporte.referenciaId}`;
    }

    if (reporte.tipo === "comentario") {
        return reporte.objetivo?.comentarioPublicacionId
            ? `muro.html?post=${reporte.objetivo.comentarioPublicacionId}&comentarios=1`
            : "muro.html";
    }

    return `muro.html?post=${reporte.referenciaId}`;
}

async function actualizarReporte(reporteId, estado) {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/reports/${reporteId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id, estado })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo actualizar el reporte");
        }

        await cargarReportes();
    } catch (error) {
        alert(error.message);
    }
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
