# Mejoras pendientes

## Datos huérfanos — mostrar fila completa en la tabla
Guardar el HTML completo del `<tr>` en el storage junto con la fecha (`{ date, html }`) para poder reinsertar los productos huérfanos directamente en la tabla con un color de fila distinto, en lugar de mostrarlos en una sección aparte.

Cambios necesarios:
- `saveToStorage`: guardar `{ date, html }` en vez de solo el string de fecha
- `createEditableCell`: al hacer blur, pasar el `outerHTML` de la fila
- Todas las lecturas del storage: extraer `.date` del objeto
- `checkOrphanData`: renderizar el HTML guardado como fila en la tabla

## Configuración de la extensión
Permitir al usuario activar/desactivar notificaciones push y popup de forma independiente desde una página de opciones o desde el propio popup.

## Refactor del código
Extraer lógica común (parseDateTime, addThreeMonths, thresholds, constantes de storage) a un módulo compartido para evitar duplicación entre content.js, background.js y popup.js. Valorar reestructuración de archivos si es necesario.

## Versionado de cambios
Valorar añadir CHANGELOG.md y/o tags de git para mantener un histórico de versiones legible, especialmente si se publica en la Chrome Web Store.
