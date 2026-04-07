# Pixelatoy Preorder Manager

Extensión de Chrome que mejora la tabla de reservas de [Pixelatoy](https://www.pixelatoy.com) añadiendo seguimiento de fechas, contador de tiempo restante y ordenación por columnas.

## Funcionalidades

### Columna "En almacén"
- Haz click en cualquier celda de la columna para introducir o editar la fecha de entrada al almacén.
- Formato de fecha esperado: `YYYY-MM-DD` o `YYYY-MM-DD HH:MM` (ej: `2024-03-15` o `2024-03-15 10:30`). La hora es opcional, si no se indica se asume `00:00`.
- También se aceptan los formatos `DD/MM/YYYY` y `DD-MM-YYYY` (ej: `15/03/2024` o `15-03-2024`), con o sin hora.
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

### Ordenación por columnas
- Las columnas con ▲▼ permiten ordenar la tabla haciendo click en el header.
- Primer click → orden ascendente.
- Segundo click → orden descendente.
- Tercer click → restaura el orden original.
- Al ordenar por una columna, la ordenación anterior se resetea.

## Instalación

### Desde la Chrome Web Store
Próximamente disponible.

### Instalación manual (modo desarrollador)
1. Descarga o clona este repositorio.
2. Abre Chrome y ve a `chrome://extensions/`.
3. Activa el **Modo desarrollador** (esquina superior derecha).
4. Haz click en **Cargar descomprimida** y selecciona la carpeta del proyecto.

## Almacenamiento de datos

Los datos introducidos se guardan en `chrome.storage.local`, vinculados al navegador y al perfil de Chrome. Ten en cuenta que:

- **Desactivar la extensión**: los datos se conservan.
- **Desinstalar la extensión**: los datos se eliminan permanentemente.

Se recomienda hacer una copia de seguridad de los datos antes de desinstalar.

## Estructura del proyecto

```
pixelatoy-extension/
├── content.js       # Lógica principal de la extensión
├── manifest.json    # Configuración de la extensión
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Compatibilidad

- Chrome con Manifest V3.
- Funciona exclusivamente en `https://www.pixelatoy.com/es/module/preorder/preorderorderdetails*`.
