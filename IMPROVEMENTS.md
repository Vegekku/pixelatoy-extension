# Mejoras pendientes

## Índice

- [1. Auto-fetch de datos del producto](#1-auto-fetch-de-datos-del-producto)
- [2. Tabla de reservas](#2-tabla-de-reservas)
- [3. Datos huérfanos](#3-datos-huérfanos)
- [4. Configuración de la extensión](#4-configuración-de-la-extensión)
- [5. Infraestructura y código](#5-infraestructura-y-código)

---

## 1. Auto-fetch de datos del producto

### 1.1 Guardar fecha de entrada en almacén ✅ Implementado

### 1.2 Guardar URL del detalle del producto ✅ Implementado
Se almacena la URL del detalle del producto en el storage (`{ date, img, productUrl }`). En cargas posteriores se salta el fetch al detalle del pedido y se accede directamente al producto, reduciendo tiempos de respuesta.

### 1.3 Guardar fecha estimada de disponibilidad ✅ Implementado
Los artículos aún no disponibles muestran la fecha estimada de disponibilidad en la columna "En almacén" (en gris cursiva). La fecha aproximada se usa para ordenar la columna. Cuando el producto pase a disponible, el refresco detecta el cambio.

### 1.4 Enlace al detalle del producto desde la tabla ✅ Implementado
El nombre del artículo en la tabla de reservas es un enlace que abre el detalle del producto en nueva pestaña, usando la URL guardada en storage.

### 1.5 Indicador visual de fila durante el fetch ✅ Implementado

### 1.6 Botón para refrescar datos manualmente ✅ Implementado
Botón “Refrescar datos” junto a la leyenda que re-consulta todos los productos. Solo muestra cambios encontrados con overlay informativo y botones de aceptar/rechazar por fila. Los enlaces rotos se reintentan.

### 1.7 Gestión de enlaces rotos al detalle del artículo ✅ Implementado
Se detectan enlaces rotos verificando la presencia de `h1.page-title[itemprop="name"]` en la página del producto. Si no existe, se marca `brokenLink: true` en storage y se muestra un icono ⛓️💥 junto al nombre. Los enlaces rotos no se reintentan automáticamente.

### 1.8 Auto-fetch en segundo plano
Programar una alarma (`chrome.alarms`) que se dispare 1-2 veces al día para obtener datos de productos sin fecha o con enlace roto directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

Puntos a definir:
- Frecuencia exacta (1 o 2 veces al día).
- Si los datos obtenidos se aplican directamente al storage o se guardan como "pendientes" para que el usuario los confirme al entrar a la página.
- El service worker ya tiene `host_permissions` y acceso a cookies, por lo que puede hacer `fetch()` directamente.
- `chrome.alarms` despierta el service worker aunque esté dormido.

### 1.9 Soporte multiidioma en la extracción de fecha
El campo "Entrada en almacén" puede aparecer con distinto nombre si la web está en inglés. Identificar el texto equivalente en inglés y contemplarlo en el selector.

---

## 2. Tabla de reservas

### 2.1 Rediseño: reservas pendientes vs en almacén
Separar la tabla en dos secciones diferenciadas: productos con fecha de entrada en almacén (activos, con contador de límite) y productos aún no disponibles (con fecha estimada de disponibilidad). Cambio de mayor calado que afecta a la estructura visual principal.

### 2.2 Coloreado de filas por urgencia ✅ Implementado

### 2.3 Leyenda e instrucciones ✅ Implementado

---

## 3. Datos huérfanos

### 3.1 Sección de aviso con eliminación individual y global ✅ Implementado

### 3.2 Mostrar imagen y enlace en datos huérfanos
Aprovechar `img` y `productUrl` del storage para enriquecer la sección de huérfanos: mostrar la miniatura del producto y enlazar el nombre a su página de detalle.

### 3.3 Mostrar fila completa en la tabla
Guardar el `outerHTML` del `<tr>` en el storage (`{ date, html }`) para reinsertar los productos huérfanos directamente en la tabla con un estilo diferenciado, en lugar de mostrarlos en una sección aparte.

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

### 5.2 Versionado de cambios
Valorar añadir `CHANGELOG.md` y/o tags de git para mantener un histórico de versiones legible, especialmente si se publica en la Chrome Web Store.
