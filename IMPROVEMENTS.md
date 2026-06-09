# Mejoras pendientes

## Índice

- [1. Auto-fetch de datos del producto](#1-auto-fetch-de-datos-del-producto)
- [2. Datos huérfanos](#2-datos-huérfanos)
- [3. Configuración de la extensión](#3-configuración-de-la-extensión)
- [4. Infraestructura y código](#4-infraestructura-y-código)

---

## 1. Auto-fetch de datos del producto

### 1.1 Guardar fecha estimada de disponibilidad
Los artículos aún no disponibles tienen una fecha estimada de disponibilidad en su detalle. Extraerla y guardarla en el storage (`{ date, img, productUrl, availableFrom }`). Útil para saber cuándo se podrá consultar la fecha de entrada real.

### 1.2 Auto-fetch en segundo plano
Programar una alarma (`chrome.alarms`) que se dispare 1-2 veces al día para obtener datos de productos sin fecha o con enlace roto directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

Puntos a definir:
- Frecuencia exacta (1 o 2 veces al día).
- Si los datos obtenidos se aplican directamente al storage o se guardan como "pendientes" para que el usuario los confirme al entrar a la página.
- El service worker ya tiene `host_permissions` y acceso a cookies, por lo que puede hacer `fetch()` directamente.
- `chrome.alarms` despierta el service worker aunque esté dormido.

### 1.3 Soporte multiidioma en la extracción de fecha
El campo "Entrada en almacén" puede aparecer con distinto nombre si la web está en inglés. Identificar el texto equivalente en inglés y contemplarlo en el selector.

---

## 2. Datos huérfanos

### 2.1 Mostrar imagen y enlace en datos huérfanos
Aprovechar `img` y `productUrl` del storage para enriquecer la sección de huérfanos: mostrar la miniatura del producto y enlazar el nombre a su página de detalle.

### 2.2 Mostrar fila completa en la tabla
Guardar el `outerHTML` del `<tr>` en el storage (`{ date, html }`) para reinsertar los productos huérfanos directamente en la tabla con un estilo diferenciado, en lugar de mostrarlos en una sección aparte.

Cambios necesarios:
- `saveToStorage`: guardar `{ date, html }` en vez de solo el string de fecha
- `createEditableCell`: al hacer blur, pasar el `outerHTML` de la fila
- Todas las lecturas del storage: extraer `.date` del objeto
- `checkOrphanData`: renderizar el HTML guardado como fila en la tabla

---

## 3. Configuración de la extensión

### 3.1 Página de opciones
Permitir al usuario activar/desactivar notificaciones push y popup de forma independiente desde una página de opciones separada (`options.html` + `options.js`).

Config guardada en `pixelatoyConfig` en `chrome.storage.local`: `{ notificaciones: true, popup: true }`. Si la clave no existe, se asumen ambos valores `true` para no romper el comportamiento actual.

Cambios necesarios:
- `options.html` + `options.js`: página de opciones con dos toggles
- `manifest.json`: añadir `options_page`
- `background.js`: leer config antes de notificar + escuchar `chrome.storage.onChanged` para activar/desactivar el popup con `setPopup`
- `popup.js`: si `popup: false`, no renderizar nada (defensa extra)

### 3.2 Exportar e importar datos
Botón en la página de opciones para exportar los datos del storage a un fichero JSON y para importarlos. Útil como copia de seguridad antes de desinstalar o migrar a otro perfil de Chrome.

---

## 4. Infraestructura y código

### 4.1 Refactor: módulo compartido ⚠️ Parcialmente implementado
`helpers.js` centraliza las constantes y funciones compartidas (`STORAGE_KEY`, `PREORDER_URL`, `THRESHOLDS`, `parseDateTime`, `addThreeMonths`) y es importado por `background.js` y `popup.js` como módulo ES.

`content.js` mantiene sus propias definiciones duplicadas porque los content scripts de Chrome MV3 no soportan `import/export`. Para eliminar la duplicación sería necesario introducir un bundler (esbuild, rollup...).
