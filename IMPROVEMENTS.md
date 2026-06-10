# Mejoras pendientes

## Índice

- [1. Auto-fetch de datos del producto](#1-auto-fetch-de-datos-del-producto)
- [2. Tabla de reservas](#2-tabla-de-reservas)
- [3. Reservas no encontradas](#3-reservas-no-encontradas)
- [4. Configuración de la extensión](#4-configuración-de-la-extensión)
- [5. Infraestructura y código](#5-infraestructura-y-código)

---

## 1. Auto-fetch de datos del producto

### 1.1 Auto-fetch en segundo plano
Programar una alarma (`chrome.alarms`) que se dispare 1-2 veces al día para obtener datos de productos sin fecha o con enlace roto directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

Puntos a definir:
- Frecuencia exacta (1 o 2 veces al día).
- Si los datos obtenidos se aplican directamente al storage o se guardan como "pendientes" para que el usuario los confirme al entrar a la página.
- El service worker ya tiene `host_permissions` y acceso a cookies, por lo que puede hacer `fetch()` directamente.
- `chrome.alarms` despierta el service worker aunque esté dormido.

### 1.2 Soporte multiidioma en la extracción de fecha
El campo "Entrada en almacén" puede aparecer con distinto nombre si la web está en inglés. Identificar el texto equivalente en inglés y contemplarlo en el selector.

---

## 2. Tabla de reservas

### 2.1 Rediseño: reservas pendientes vs en almacén
Separar la tabla en dos secciones diferenciadas: productos con fecha de entrada en almacén (activos, con contador de límite) y productos aún no disponibles (con fecha estimada de disponibilidad). Cambio de mayor calado que afecta a la estructura visual principal.

---

## 3. Reservas no encontradas

### 3.1 Mostrar fila completa en la tabla
Guardar el `outerHTML` del `<tr>` en el storage para reinsertar los productos no encontrados directamente en la tabla con un estilo diferenciado, en lugar de mostrarlos en una sección aparte.

Cambios necesarios:
- `saveToStorage`: guardar `{ date, html }` en vez de solo el string de fecha
- `createEditableCell`: al hacer blur, pasar el `outerHTML` de la fila
- Todas las lecturas del storage: extraer `.date` del objeto
- `checkOrphanData`: renderizar el HTML guardado como fila en la tabla

---

## 4. Configuración de la extensión

### 4.1 Página de opciones
Permitir al usuario activar/desactivar notificaciones push y popup de forma independiente desde una página de opciones separada (`options.html` + `options.js`).

Config guardada en `pixelatoyConfig` en `chrome.storage.local`: `{ notificaciones: true, popup: true }`. Si la clave no existe, se asumen ambos valores `true` para no romper el comportamiento actual.

Cambios necesarios:
- `options.html` + `options.js`: página de opciones con dos toggles
- `manifest.json`: añadir `options_page`
- `background.js`: leer config antes de notificar + escuchar `chrome.storage.onChanged` para activar/desactivar el popup con `setPopup`
- `popup.js`: si `popup: false`, no renderizar nada (defensa extra)

### 4.2 Exportar e importar datos
Botón en la página de opciones para exportar los datos del storage a un fichero JSON y para importarlos. Útil como copia de seguridad antes de desinstalar o migrar a otro perfil de Chrome.

---

## 5. Infraestructura y código

### 5.1 Refactor: módulo compartido ⚠️ Parcialmente implementado
`helpers.js` centraliza las constantes y funciones compartidas (`STORAGE_KEY`, `PREORDER_URL`, `THRESHOLDS`, `parseDateTime`, `addThreeMonths`) y es importado por `background.js` y `popup.js` como módulo ES.

`content.js` mantiene sus propias definiciones duplicadas porque los content scripts de Chrome MV3 no soportan `import/export`. Para eliminar la duplicación sería necesario introducir un bundler (esbuild, rollup...).
