# Mejoras pendientes

## Índice

- [1. Auto-fetch de datos del producto](#1-auto-fetch-de-datos-del-producto)
- [2. Tabla de reservas](#2-tabla-de-reservas)
- [3. Configuración de la extensión](#3-configuración-de-la-extensión)
- [4. Icono y notificaciones](#4-icono-y-notificaciones)
- [5. Historial de fechas](#5-historial-de-fechas)
- [6. UX](#6-ux)
- [7. Infraestructura y código](#7-infraestructura-y-código)

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

## 4. Icono y notificaciones

### 4.1 Badge en el icono de la extensión
Mostrar un badge numérico en el icono con el número de productos que tienen menos de X días para el límite (umbral configurable). Permite ver de un vistazo cuántos productos son urgentes sin abrir el popup.

Implementación: `chrome.action.setBadgeText` y `chrome.action.setBadgeBackgroundColor` desde `background.js`. Se actualiza al cargar la página y al recibir cambios en `chrome.storage.onChanged`.

### 4.2 Notificación al detectar cambios en auto-fetch
Cuando el auto-fetch en segundo plano (punto 1.1) detecta que un producto "No disponible" ha pasado a tener fecha de entrada en almacén, lanzar una notificación push al usuario sin que tenga que abrir la página.

Depende de que el punto 1.1 esté implementado.

---

## 5. Historial de fechas

Guardar un log de las fechas que ha tenido cada producto: fecha estimada de disponibilidad (según auto-fetch) y fecha real de entrada en almacén. Permite ver si Pixelatoy cumple sus plazos estimados.

Puntos a definir:
- Dónde mostrar el historial (tooltip en la celda, sección en la página de opciones, etc.).
- Límite de entradas por producto para no crecer indefinidamente el storage.

---

## 6. UX

### 6.1 Persistencia del tab activo
Si el usuario está en el tab "No disponible" y recarga la página, restaurar ese tab en lugar de volver siempre a "En almacén". Guardar el tab activo en `chrome.storage.local` o `sessionStorage`.

### 6.2 Modo oscuro
Respetar `prefers-color-scheme: dark` en los elementos que inyecta la extensión: leyenda, instrucciones de uso y sección de orphans. Los colores de las filas de la tabla ya son configurables (punto 3.1) y quedan fuera de este alcance.

---

## 7. Infraestructura y código

### 7.1 Refactor: módulo compartido ⚠️ Parcialmente implementado
`helpers.js` centraliza las constantes y funciones compartidas (`STORAGE_KEY`, `PREORDER_URL`, `THRESHOLDS`, `parseDateTime`, `addThreeMonths`) y es importado por `background.js` y `popup.js` como módulo ES.

`content.js` mantiene sus propias definiciones duplicadas porque los content scripts de Chrome MV3 no soportan `import/export`. Para eliminar la duplicación sería necesario introducir un bundler (esbuild, rollup...), lo que además es requisito si se adopta minificación u ofuscación (punto 7.2).

### 7.2 Minificación y ofuscación del código
El código de una extensión instalada es completamente legible desde `chrome://extensions/`. 

- **Minificar**: reduce el tamaño del `.zip` y añade algo de fricción para leer el código. Recomendable.
- **Ofuscar**: Google lo mira con lupa en la revisión de la Chrome Web Store y puede rechazar la extensión; además obliga a subir el código fuente original. Como barrera anti-copia es fácilmente reversible por alguien con experiencia. Pendiente de decidir si compensa.

Si se adopta alguna de las dos opciones, sería necesario introducir un bundler (esbuild, rollup...), lo que también resolvería el problema de duplicación de código del punto 7.1.


