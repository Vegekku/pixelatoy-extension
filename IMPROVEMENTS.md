# Mejoras pendientes

## Datos huérfanos — mostrar fila completa en la tabla
Guardar el HTML completo del `<tr>` en el storage junto con la fecha (`{ date, html }`) para poder reinsertar los productos huérfanos directamente en la tabla con un color de fila distinto, en lugar de mostrarlos en una sección aparte.

Cambios necesarios:
- `saveToStorage`: guardar `{ date, html }` en vez de solo el string de fecha
- `createEditableCell`: al hacer blur, pasar el `outerHTML` de la fila
- Todas las lecturas del storage: extraer `.date` del objeto
- `checkOrphanData`: renderizar el HTML guardado como fila en la tabla

## Configuración de la extensión
Permitir al usuario activar/desactivar notificaciones push y popup de forma independiente desde una página de opciones separada (`options.html` + `options.js`).

Desactivar el popup significa que el icono de la extensión no hace nada (`chrome.action.setPopup({ popup: "" })`).

Config guardada en `pixelatoyConfig` en `chrome.storage.local`: `{ notificaciones: true, popup: true }`. Si la clave no existe, se asumen ambos valores `true` para no romper el comportamiento actual.

Cambios necesarios:
- `options.html` + `options.js`: página de opciones con dos toggles
- `manifest.json`: añadir `options_page`
- `background.js`: leer config antes de notificar + escuchar `chrome.storage.onChanged` para activar/desactivar el popup con `setPopup`
- `popup.js`: si `popup: false`, no renderizar nada (defensa extra)

## Refactor del código ⚠️ Parcialmente implementado
`helpers.js` centraliza las constantes y funciones compartidas (`STORAGE_KEY`, `PREORDER_URL`, `THRESHOLDS`, `parseDateTime`, `addThreeMonths`) y es importado por `background.js` y `popup.js` como módulo ES.

`content.js` mantiene sus propias definiciones duplicadas porque los content scripts de Chrome MV3 no soportan `import/export` ni módulos ES. La única alternativa sin bundler sería cargar `helpers.js` como script global vía el array `js` del manifest, pero eso es incompatible con los `export` que necesitan `background.js` y `popup.js`.

Para eliminar la duplicación en `content.js` sería necesario introducir un bundler (esbuild, rollup...) que resuelva los imports en tiempo de build.

## Versionado de cambios
Valorar añadir CHANGELOG.md y/o tags de git para mantener un histórico de versiones legible, especialmente si se publica en la Chrome Web Store.
