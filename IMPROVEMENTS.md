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

## 3. Reservas no encontradas

Sección colapsable debajo de la tabla que muestra las reservas con datos guardados pero que ya no aparecen en la tabla. Permite eliminar cada reserva individualmente o todas a la vez.

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
