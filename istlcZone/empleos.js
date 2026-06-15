async function cargarEmpleos() {
    const lista = document.getElementById("listaEmpleos");
    const filtroFecha = document.getElementById("dateFilter").value;

    lista.innerHTML = `
        <div class="card shadow-sm p-4 text-muted">
            Cargando ofertas...
        </div>
    `;

    try {
        const respuesta = await fetch(
            "https://www.arbeitnow.com/api/job-board-api"
        );

        const data = await respuesta.json();
        let empleos = data.data || [];

        empleos = empleos.filter((empleo) => {
            const fechaEmpleo = new Date(empleo.created_at * 1000);
            const hoy = new Date();

            if (filtroFecha === "today") {
                return fechaEmpleo.toDateString() === hoy.toDateString();
            }

            if (filtroFecha === "week") {
                const haceSemana = new Date();
                haceSemana.setDate(hoy.getDate() - 7);
                return fechaEmpleo >= haceSemana;
            }

            if (filtroFecha === "month") {
                const haceMes = new Date();
                haceMes.setMonth(hoy.getMonth() - 1);
                return fechaEmpleo >= haceMes;
            }

            return true;
        });

        empleos.sort((a, b) => b.created_at - a.created_at);

        if (!empleos.length) {
            lista.innerHTML = `
                <div class="card shadow-sm p-4">
                    <p class="text-muted mb-0">
                        No se encontraron ofertas con el filtro seleccionado.
                    </p>
                </div>
            `;
            return;
        }

        lista.innerHTML = empleos.map(tarjetaEmpleo).join("");
    } catch (error) {
        console.error(error);

        lista.innerHTML = `
            <div class="card shadow-sm p-4">
                <p class="text-danger mb-0">
                    No se pudieron cargar las ofertas desde la API.
                </p>
            </div>
        `;
    }
}

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

function tarjetaEmpleo(empleo) {
    const fecha = new Date(empleo.created_at * 1000).toLocaleDateString(
        "es-EC",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }
    );

    const empleoSeguro = encodeURIComponent(JSON.stringify(empleo));

    return `
        <div class="card shadow-sm p-4 mb-3 empleo-card">
            <h4 class="mb-2">
                <a
                    href="#"
                    class="empleo-link"
                    onclick="verDetalleEmpleo('${empleoSeguro}')"
                >
                    ${limpiarTitulo(empleo.title)}
                </a>
            </h4>

            <p class="mb-1">
                <strong>Lugar:</strong>
                ${empleo.location || "No especificado"}
            </p>

            <p class="mb-0 text-muted">
                <strong>Fecha de publicacion:</strong>
                ${fecha}
            </p>
        </div>
    `;
}

function verDetalleEmpleo(empleoTexto) {
    const empleo = JSON.parse(decodeURIComponent(empleoTexto));
    localStorage.setItem("empleoSeleccionado", JSON.stringify(empleo));
    window.location.href = "detalleEmpleo.html";
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}

cargarEmpleos();
