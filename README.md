# Pixelatoy Preorder Manager

Extensión de Chrome que mejora la tabla de reservas de [Pixelatoy](https://www.pixelatoy.com) añadiendo seguimiento de fechas de almacén, enlaces a productos con detección de enlaces rotos, refresco manual de datos, contador de tiempo restante y ordenación por columnas.

## Funcionalidades

### Columna "En almacén"
- Haz click en cualquier celda de la columna para introducir o editar la fecha de entrada al almacén.
- Formato de fecha esperado: `YYYY-MM-DD` o `YYYY-MM-DD HH:MM` (ej: `2024-03-15` o `2024-03-15 10:30`). La hora es opcional, si no se indica se asume `00:00`.
- También se aceptan los formatos `DD/MM/YYYY`, `DD-MM-YYYY` (ej: `15/03/2024` o `15-03-2024`), `DD mes YYYY` (ej: `15 marzo 2024`) y `mes DD, YYYY` (ej: `February 23, 2026`), con o sin hora.
- Al salir del campo, la fecha se guarda automáticamente y la celda muestra un contador dinámico con el tiempo restante hasta el límite (fecha de entrada + 3 meses).
- El contador se actualiza automáticamente cada minuto con el formato `Xm Xd Xh Xmin`.
- Si se borra la fecha, el contador desaparece y el color de la fila se resetea.

### Coloreado de filas
Las filas se colorean automáticamente según el tiempo restante hasta el límite:

| Color | Significado |
|-------|-------------|
| ⬛ Negro | Menos de 7 días |
| 🟥 Rojo | Menos de 30 días |
| 🟧 Naranja | Menos de 60 días |
| 🟩 Verde | 60 días o más |

### Reservas no encontradas
- Si un producto desaparece de la tabla de reservas (enviado o eliminado) pero tiene datos guardados en el almacenamiento, se muestra una sección <em>Reservas no encontradas</em> debajo de la tabla.
- Para cada reserva se muestra: miniatura del producto, nombre con enlace a su ficha y estado del límite (tiempo restante o vencido).
- Se puede eliminar cada reserva individualmente o todas a la vez.
- La sección solo aparece si hay reservas no encontradas y es colapsable.

### Popup de estado
- Al hacer click en el icono de la extensión se muestra un resumen de productos agrupados por urgencia.
- Rangos mostrados: menos de 7 días, menos de 30 días, menos de 60 días, 60 días o más.
- Cada rango es un toggle desplegable que muestra las imágenes de los productos.
- Solo se muestran los rangos que tengan productos.
- Botón para ir directamente a la página de reservas.

### Ordenación por columnas
- Las columnas con ▲▼ permiten ordenar la tabla haciendo click en el header.
- Primer click → orden ascendente.
- Segundo click → orden descendente.
- Tercer click → restaura el orden original.
- Al ordenar por una columna, la ordenación anterior se resetea.

### Obtención automática de datos
- Al cargar la página, la extensión obtiene automáticamente la URL del producto y la fecha de entrada en almacén para los productos que no tengan estos datos guardados.
- Durante la consulta se muestra un overlay de carga sobre la fila afectada.
- Si el producto aún no está disponible, no se extrae fecha pero sí se guarda el enlace para futuras consultas.

### Enlace al detalle del producto
- El nombre del producto en la tabla es un enlace que abre su página de detalle en nueva pestaña.
- Si el enlace está roto (la página no corresponde al producto), se muestra un icono ⛓️💥 junto al nombre.

### Refrescar datos
- Botón "Refrescar datos" junto a la leyenda para re-consultar la información de todos los productos.
- Solo se muestran los cambios encontrados respecto a los datos almacenados.
- Cada fila con cambios muestra un overlay informativo con la comparación y botones para aceptar o rechazar individualmente.
- Los enlaces rotos se reintentan durante el refresco.

## Instalación

### Desde la Chrome Web Store
Próximamente disponible.

### Instalación manual (modo desarrollador)
1. Descarga o clona este repositorio.
2. Abre Chrome y ve a `chrome://extensions/`.
3. Activa el **Modo desarrollador** (esquina superior derecha).
4. Haz click en **Cargar descomprimida** y selecciona la carpeta del proyecto.

## Almacenamiento de datos

Los datos introducidos se guardan en `chrome.storage.local`, vinculados al navegador y al perfil de Chrome.

Cada producto se almacena con la estructura `{ date, img, productUrl, brokenLink }`, donde `date` es la fecha de entrada, `img` la URL de la imagen del producto, `productUrl` la URL de la página de detalle y `brokenLink` indica si el enlace al producto es inválido.

- **Desactivar la extensión**: los datos se conservan.
- **Desinstalar la extensión**: los datos se eliminan permanentemente.

Se recomienda hacer una copia de seguridad de los datos antes de desinstalar.

## Estructura del proyecto

```
pixelatoy-extension/
├── content.js       # Lógica principal de la extensión
├── background.js    # Service worker para notificaciones y alarmas
├── helpers.js       # Constantes y funciones compartidas (módulo ES)
├── popup.html       # Popup del icono de la extensión
├── popup.js         # Lógica del popup
├── manifest.json    # Configuración de la extensión
├── CHANGELOG.md     # Historial de versiones
├── IMPROVEMENTS.md  # Ideas y mejoras pendientes
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Compatibilidad

- Chrome con Manifest V3.
- Funciona exclusivamente en `https://www.pixelatoy.com/es/module/preorder/preorderorderdetails*`.
