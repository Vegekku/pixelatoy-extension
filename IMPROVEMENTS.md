# Mejoras pendientes

## Priorización

| Bloque | Descripción | Puntos | Notas |
|--------|-------------|--------|-------|
| 1 — Base técnica | Antes de cualquier cosa | [9.4](#94-refactor-helpers-compartidos) + [9.5](#95-refactor-estructural-contentjs) | Desbloquea todo lo demás. Sin esto, cada nueva funcionalidad añade más deuda técnica |
| 2 — Fixes y soporte básico | | [1.2](#12-soporte-esen) | La extensión no funciona en inglés, es un bug. Fácil una vez esté el bundler |
| 3 — Mejoras sobre lo que ya existe | | [2.1](#21-rediseño-tabs-en-almacén--no-disponible), [6.1](#61-badge-en-el-icono-de-la-extensión), [8.1](#81-persistencia-del-tab-activo), [3.1](#31-página-de-opciones) + [3.2](#32-exportar-e-importar-datos) | 3.1 + 3.2 necesarios antes de añadir más configurables |
| 4 — Funcionalidad nueva (reservas) | | [1.1](#11-auto-fetch-en-segundo-plano), [6.2](#62-notificación-al-detectar-cambios-en-auto-fetch), [7](#7-historial-de-fechas) | 6.2 y 7 dependen de 1.1 |
| 5 — Expansión más allá de reservas | | [4.1](#41-enriquecimiento-de-la-tabla-de-favoritos) + [4.2](#42-indicador-de-favorito-en-el-detalle-del-producto), [5.1](#51-resaltar-productos-en-reserva-o-favoritos-en-el-catálogo) – [5.4](#54-historial-de-precios-en-el-detalle-del-producto), [8.2](#82-modo-oscuro) | El alcance más amplio; requiere madurez técnica previa |

---

## Índice

- [1. Auto-fetch de datos del producto](#1-auto-fetch-de-datos-del-producto)
- [2. Tabla de reservas](#2-tabla-de-reservas)
- [3. Configuración de la extensión](#3-configuración-de-la-extensión)
- [4. Favoritos y detalle de producto](#4-favoritos-y-detalle-de-producto)
- [5. Catálogo y detalle de producto](#5-catálogo-y-detalle-de-producto)
- [6. Icono y notificaciones](#6-icono-y-notificaciones)
- [7. Historial de fechas](#7-historial-de-fechas)
- [8. UX](#8-ux)
- [9. Infraestructura y código](#9-infraestructura-y-código)
---

## 1. Auto-fetch de datos del producto

### 1.1 Auto-fetch en segundo plano
Programar una alarma (`chrome.alarms`) que se dispare 1-2 veces al día para obtener datos de productos sin fecha o con enlace roto directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

Puntos a definir:
- Frecuencia exacta (1 o 2 veces al día).
- Si los datos obtenidos se aplican directamente al storage o se guardan como "pendientes" para que el usuario los confirme al entrar a la página.
- El service worker ya tiene `host_permissions` y acceso a cookies, por lo que puede hacer `fetch()` directamente.
- `chrome.alarms` despierta el service worker aunque esté dormido.

### 1.2 Soporte ES/EN
La extensión solo carga en español porque el `manifest.json` solo cubre `/es/module/preorder/preorderorderdetails*`. Hay que añadir el match para `/en/module/preorder/preorderorderdetails*`.

Además, todos los textos hardcodeados en español deben soportar inglés:

Implementación mediante fichero `i18n.js` propio (no `chrome.i18n`) porque el criterio de idioma es el de la web de Pixelatoy (`document.documentElement.lang`), no el del navegador.

Cambios necesarios:
- `manifest.json`: añadir match para `/en/module/preorder/preorderorderdetails*`. Añadir `i18n.js` antes de `content.js` en `content_scripts`.
- `i18n.js` (nuevo): objeto `MESSAGES` con claves en `es` y `en`. Constante `LANG` detectada por `document.documentElement.lang`. Función `t(key)` con fallback a `es`. Exportada como módulo ES para uso en `popup.js` y `background.js`; cargada como script previo en `content_scripts` para `content.js`.
- `content.js`: sustituir todos los literales por llamadas a `t()`. Textos afectados: cabecera de columna, `THRESHOLDS.label`, botón "Refrescar datos", instrucciones de uso, sección orphans, contador "Vencido", tooltips, placeholder, `confirm()` de borrado. Selectores de la ficha del producto: `"Entrada en almacén"` y `"Disponibilidad"` → verificar equivalentes EN en la web antes de implementar. Selector `"No disponible"` en `autoFetchRowData` → ídem.
- `popup.js`: importar `i18n.js` como módulo ES y sustituir literales.
- `background.js`: importar `i18n.js` como módulo ES y sustituir literales de notificaciones.

---

## 2. Tabla de reservas

### 2.1 Rediseño: tabs "En almacén" / "No disponible"
Sustituir la tabla única por dos tabs con su propia tabla cada una. Tab por defecto: "En almacén" (es la que requiere acción inmediata del usuario).

Cada tab muestra un contador de productos en el título, ej: `En almacén (5)` / `No disponible (3)`.

Las dos tablas son idénticas en estructura y número de columnas. Solo cambia la columna de fecha, que aparece en la misma posición en ambas:
- Tab "En almacén": header `En almacén`, contenido = contador de límite (fecha entrada + 3 meses).
- Tab "No disponible": header `Disponibilidad estimada`, contenido = fecha estimada en gris cursiva.

La ordenación, coloreado de filas y resto de funcionalidades se aplican de forma independiente en cada tabla.

Implementación: tabla única con filas ocultas/mostradas por `display:none/block` según el tab activo. Al cambiar de tab solo cambia el texto del header de la columna de fecha. La ordenación afecta a todas las filas (visibles y ocultas); queda pendiente decidir si en el futuro debe operar solo sobre las filas visibles.

---

## 3. Configuración de la extensión

### 3.1 Página de opciones
Permitir al usuario configurar el comportamiento y apariencia de la extensión desde una página de opciones separada (`options.html` + `options.js`).

Config guardada en `pixelatoyConfig` en `chrome.storage.local`. Si la clave no existe, se asumen los valores por defecto para no romper el comportamiento actual.

Opciones configurables:
- **Notificaciones push**: activar/desactivar.
- **Popup**: activar/desactivar.
- **Colores de los 4 rangos**: color de fondo y texto para cada umbral.
- **Días de los umbrales**: valores de los 3 cortes (actualmente 7, 30, 60). El cuarto rango es siempre "el resto".
- **Límite de reserva**: número de meses desde la fecha de entrada (máximo 3, que es la política actual de Pixelatoy).
- **Tab por defecto**: "En almacén" o "No disponible".
- **Instrucciones de uso**: mostrar expandidas o colapsadas por defecto.

Cambios necesarios:
- `options.html` + `options.js`: página de opciones con los controles correspondientes.
- `manifest.json`: añadir `options_page`.
- `background.js`: leer config antes de notificar + escuchar `chrome.storage.onChanged` para activar/desactivar el popup con `setPopup`.
- `popup.js`: si `popup: false`, no renderizar nada (defensa extra).
- `content.js`: leer config al iniciar y aplicar umbrales, colores, límite, tab por defecto e instrucciones.

### 3.2 Exportar e importar datos
Botón en la página de opciones para exportar los datos del storage a un fichero JSON y para importarlos. Útil como copia de seguridad antes de desinstalar o migrar a otro perfil de Chrome.

---

## 4. Favoritos y detalle de producto

### 4.1 Enriquecimiento de la tabla de favoritos
Pixelatoy tiene una página de favoritos propia (`/es/module/wkwishlist/viewwishlist`) con una tabla de 3 columnas (imagen, nombre, acciones). Los favoritos se almacenan en el servidor de Pixelatoy, por lo que la extensión no necesita su propio storage para ellos: simplemente lee y enriquece lo que ya está en la página.

Datos a incorporar a la tabla (obtenidos del detalle del producto via auto-fetch):
- Disponibilidad / fecha estimada.
- Precio actual.
- Precio más bajo registrado.
- Cualquier otro dato relevante que aparezca en el detalle del producto.

Cambios necesarios:
- `manifest.json`: añadir match para `/es/module/wkwishlist/viewwishlist*` (y `/en/` equivalente).
- Nuevo script o sección en `content.js` para detectar la página de favoritos y enriquecer la tabla.

### 4.2 Indicador de favorito en el detalle del producto
El botón de guardar favorito en la página de detalle no indica si el producto ya está en la lista. Modificar su aspecto para reflejarlo visualmente sin desentonar con el diseño de Pixelatoy.

Implementación: al cargar la página de detalle, consultar la lista de favoritos (fetch a la página de favoritos o via API si existe) y cambiar el estilo/texto/icono del botón según el resultado.

Cambios necesarios:
- `manifest.json`: añadir match para las páginas de detalle de producto si no está ya cubierto.

---

## 5. Catálogo y detalle de producto

### 5.1 Resaltar productos en reserva o favoritos en el catálogo
Mientras el usuario navega el catálogo, resaltar visualmente las tarjetas de productos que ya tiene en reserva o en favoritos.

### 5.2 Precio más bajo en tarjetas del catálogo
Mostrar el precio más bajo histórico directamente en las tarjetas del listado sin necesidad de entrar al detalle.

### 5.3 Alerta de bajada de precio en favoritos
Notificar si el precio de un producto en favoritos baja respecto al último valor guardado. Depende del auto-fetch en segundo plano (punto 1.1).

### 5.4 Historial de precios en el detalle del producto
Mostrar un historial de precios (lista o minigráfico) directamente en la página de detalle del producto.

---

## 6. Icono y notificaciones

### 6.1 Badge en el icono de la extensión
Mostrar un badge numérico en el icono con el número de productos que tienen menos de X días para el límite (umbral configurable). Permite ver de un vistazo cuántos productos son urgentes sin abrir el popup.

Implementación: `chrome.action.setBadgeText` y `chrome.action.setBadgeBackgroundColor` desde `background.js`. Se actualiza al cargar la página y al recibir cambios en `chrome.storage.onChanged`.

### 6.2 Notificación al detectar cambios en auto-fetch
Cuando el auto-fetch en segundo plano (punto 1.1) detecta que un producto "No disponible" ha pasado a tener fecha de entrada en almacén, lanzar una notificación push al usuario sin que tenga que abrir la página.

Depende de que el punto 1.1 esté implementado.

---

## 7. Historial de fechas

Guardar un log de las fechas que ha tenido cada producto: fecha estimada de disponibilidad (según auto-fetch) y fecha real de entrada en almacén. Permite ver si Pixelatoy cumple sus plazos estimados.

Puntos a definir:
- Dónde mostrar el historial (tooltip en la celda, sección en la página de opciones, etc.).
- Límite de entradas por producto para no crecer indefinidamente el storage.

---

## 8. UX

### 8.1 Persistencia del tab activo
Si el usuario está en el tab "No disponible" y recarga la página, restaurar ese tab en lugar de volver siempre a "En almacén". Guardar el tab activo en `chrome.storage.local` o `sessionStorage`.

### 8.2 Modo oscuro
Respetar `prefers-color-scheme: dark` en los elementos que inyecta la extensión: leyenda, instrucciones de uso y sección de orphans. Los colores de las filas de la tabla ya son configurables (punto 3.1) y quedan fuera de este alcance.

---

## 9. Infraestructura y código

### 9.4 Refactor: helpers compartidos

Oportunidades de refactor identificadas tras introducir el bundler. Ordenadas por prioridad:

**🔴 Bug**
- `background.js` usa `chrome.tabs.create()` pero `"tabs"` no está declarado en `permissions` del `manifest.json`. Falla silenciosamente al hacer click en una notificación.

**🟠 Deuda técnica (duplicación real)**
- El objeto `MONTHS` (`{ enero:1, ..., january:1, ... }`) está duplicado en `parseNaturalDate` y `parseAvailableFrom` dentro de `content.js`. Moverlo a `helpers.js` como constante exportada.
- `toISODateTime` existe en `content.js` pero `addThreeMonths` en `helpers.js` reimplementa el mismo padding inline. Mover `toISODateTime` a `helpers.js` y usarla en `addThreeMonths`.

**🟡 Legibilidad**
- El filtro `Array.from(table.querySelectorAll("tr")).filter(r => r.querySelectorAll("th").length === 0)` se repite 6 veces en `content.js`. Extraer como `getDataRows(table)` en `helpers.js`.
- El patrón `new Promise(resolve => chrome.storage.local.get(STORAGE_KEY, res => resolve(...)))` se repite varias veces. Extraer como `getStorage()` en `helpers.js`.
- La lógica de agrupar productos por umbral está duplicada entre `popup.js` y `background.js`. Extraer como `groupByThreshold(data)` en `helpers.js`.

**🟢 Nice to have**
- Los estilos CSS están embebidos como string en `addLegend` dentro de `content.js`. Moverlos a un fichero `src/content.css` e importarlo (requiere plugin esbuild para CSS o inyección manual).

### 9.5 Refactor estructural: content.js

Refactors de mayor calado para mejorar rendimiento, legibilidad y mantenibilidad a largo plazo.

**Separación de responsabilidades — partir content.js en módulos**

`content.js` tiene ~900 líneas mezclando parsing, DOM, storage, fetching, overlays, ordenación y leyenda. Propuesta:

```
src/
├── content.js          # solo init + orquestación
└── modules/
    ├── column.js       # applyCustomColumn, createEditableCell, updateCell
    ├── fetch.js        # autoFetch, resolveProductUrl, fetchDateFromProduct
    ├── sort.js         # sortTable, applyColumnSorting
    ├── refresh.js      # refreshAllData, refreshRowData
    ├── legend.js       # addLegend, instrucciones
    └── orphans.js      # checkOrphanData
```

**Estado global implícito**

`sortState` es una variable suelta a nivel de módulo. Si en el futuro hay dos tablas (punto 2.1), esto rompe. Pasar el estado como argumento o encapsularlo lo haría más robusto.

**`createOverlay` / `createInfoOverlay` — abstracción incompleta**

Ambas duplican la lógica de posicionamiento sobre filas (`rect`, `style.cssText`). Una función base `createRowOverlay(row, className)` que devuelva el div posicionado, y cada variante añade su contenido encima.

**`saveToStorage` — lectura + escritura en cada llamada**

Cada llamada hace `get` + `set`. En operaciones en lote (aceptar todos los cambios del refresh) genera N lecturas innecesarias. Un write-through cache que mantenga el estado en memoria y sincronice sería más eficiente.

**Estilos inline — mantenibilidad**

Decenas de `style.cssText = "..."` repartidos por `content.js` dificultan cambiar el diseño. Solución sin plugins: definir todas las clases en el string CSS de `addLegend` y asignar `className` en lugar de `style.cssText`.

**`normalizeDateTime` + `parseNaturalDate` — complejidad ciclomática alta**

7 ramas condicionales en total. Difícil razonar sobre qué formatos acepta. Un array de `[regex, handler]` haría el código más declarativo y extensible.
