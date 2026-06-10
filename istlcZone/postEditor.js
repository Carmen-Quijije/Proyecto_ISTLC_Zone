function abrirEditorPublicacionApp(publicacion, subirImagenesCallback) {
    return new Promise((resolve) => {
        const imagenesActuales = obtenerImagenesEditor(publicacion);
        let imagenesGuardadas = [...imagenesActuales];
        let archivosNuevos = [];
        let vistasNuevas = [];
        const modal = crearModalEditorPublicacion();
        const textarea = modal.querySelector("#editorContenidoPublicacion");
        const existentes = modal.querySelector("#editorImagenesExistentes");
        const nuevas = modal.querySelector("#editorImagenesNuevas");
        const input = modal.querySelector("#editorInputImagenes");
        const contador = modal.querySelector("#editorContadorImagenes");
        const botonGuardar = modal.querySelector("#editorGuardarPublicacion");

        textarea.value = publicacion?.contenido || "";

        const cerrar = (resultado) => {
            vistasNuevas.forEach((url) => URL.revokeObjectURL(url));
            modal.classList.add("d-none");
            resolve(resultado);
        };

        const render = () => {
            existentes.innerHTML = imagenesGuardadas.length
                ? imagenesGuardadas.map((imagen, indice) => `
                    <div class="editor-imagen-item">
                        <img src="${imagen}" alt="Imagen actual">
                        <button type="button" onclick="quitarImagenEditor(${indice})">Quitar</button>
                    </div>
                `).join("")
                : `<p class="text-muted mb-0">Esta publicacion no tiene fotos guardadas.</p>`;

            nuevas.innerHTML = vistasNuevas.map((url) => `
                <div class="editor-imagen-item nueva">
                    <img src="${url}" alt="Imagen nueva">
                </div>
            `).join("");

            contador.textContent = `${imagenesGuardadas.length + archivosNuevos.length}/6 fotos`;
        };

        window.quitarImagenEditor = (indice) => {
            imagenesGuardadas = imagenesGuardadas.filter((_, itemIndice) => itemIndice !== indice);
            render();
        };

        input.onchange = () => {
            vistasNuevas.forEach((url) => URL.revokeObjectURL(url));
            const disponibles = Math.max(0, 6 - imagenesGuardadas.length);
            archivosNuevos = Array.from(input.files).slice(0, disponibles);
            vistasNuevas = archivosNuevos.map((archivo) => URL.createObjectURL(archivo));
            render();
        };

        modal.querySelector("#editorCancelarPublicacion").onclick = () => cerrar(null);
        modal.querySelector(".editor-overlay").onclick = () => cerrar(null);
        modal.querySelector("#editorElegirImagenes").onclick = () => input.click();

        botonGuardar.onclick = async () => {
            const contenido = textarea.value.trim();
            if (!contenido) {
                mostrarToastAppSeguro("La publicacion no puede quedar vacia", "error");
                return;
            }

            try {
                botonGuardar.disabled = true;
                botonGuardar.textContent = archivosNuevos.length ? "Subiendo fotos..." : "Guardando...";
                const subidas = archivosNuevos.length
                    ? await subirImagenesCallback(archivosNuevos, "istlc-zone/publicaciones")
                    : [];

                cerrar({
                    contenido,
                    imagenesUrls: [...imagenesGuardadas, ...subidas].slice(0, 6)
                });
            } catch (error) {
                mostrarToastAppSeguro(error.message || "No se pudieron subir las fotos", "error");
            } finally {
                botonGuardar.disabled = false;
                botonGuardar.textContent = "Guardar cambios";
            }
        };

        render();
        modal.classList.remove("d-none");
        textarea.focus();
    });
}

function crearModalEditorPublicacion() {
    let modal = document.getElementById("modalEditorPublicacionApp");
    if (modal) {
        return modal;
    }

    modal = document.createElement("section");
    modal.id = "modalEditorPublicacionApp";
    modal.className = "editor-publicacion-modal d-none";
    modal.innerHTML = `
        <div class="editor-overlay"></div>
        <div class="editor-publicacion-card">
            <div class="editor-publicacion-header">
                <h3>Editar publicacion</h3>
                <span id="editorContadorImagenes">0/6 fotos</span>
            </div>
            <textarea id="editorContenidoPublicacion" class="form-control" rows="4"></textarea>
            <div class="editor-publicacion-bloque">
                <strong>Fotos actuales</strong>
                <div id="editorImagenesExistentes" class="editor-imagenes-grid"></div>
            </div>
            <div class="editor-publicacion-bloque">
                <button id="editorElegirImagenes" class="btn btn-light w-100" type="button">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                    Agregar fotos desde el ordenador
                </button>
                <input id="editorInputImagenes" type="file" accept="image/*" multiple hidden>
                <div id="editorImagenesNuevas" class="editor-imagenes-grid mt-2"></div>
            </div>
            <div class="editor-publicacion-acciones">
                <button id="editorCancelarPublicacion" class="btn btn-light" type="button">Cancelar</button>
                <button id="editorGuardarPublicacion" class="btn btn-warning" type="button">Guardar cambios</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function obtenerImagenesEditor(publicacion) {
    if (Array.isArray(publicacion?.imagenes) && publicacion.imagenes.length) {
        return publicacion.imagenes.filter(Boolean);
    }

    return publicacion?.imagenUrl ? [publicacion.imagenUrl] : [];
}

function mostrarToastAppSeguro(mensaje, tipo) {
    if (typeof mostrarToastApp === "function") {
        mostrarToastApp(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}
