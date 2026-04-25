# Mejoras pendientes

## Datos huérfanos — mostrar fila completa en la tabla
Guardar el HTML completo del `<tr>` en el storage junto con la fecha (`{ date, html }`) para poder reinsertar los productos huérfanos directamente en la tabla con un color de fila distinto, en lugar de mostrarlos en una sección aparte.

Cambios necesarios:
- `saveToStorage`: guardar `{ date, html }` en vez de solo el string de fecha
- `createEditableCell`: al hacer blur, pasar el `outerHTML` de la fila
- Todas las lecturas del storage: extraer `.date` del objeto
- `checkOrphanData`: renderizar el HTML guardado como fila en la tabla

## Popup de la extensión
Usar el popup (click en el icono de la extensión) para mostrar la misma información que las notificaciones: resumen de productos agrupados por rango de urgencia (< 7 días, < 30 días, < 60 días).
