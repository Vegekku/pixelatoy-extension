# Mejoras pendientes

## Priorización

| Bloque | Descripción | Puntos | Notas |
|--------|-------------|--------|-------|
| 3 — Mejoras sobre lo que ya existe | | [2.2](#22-fusión-de-columnas-precio-y-pagado), [6.1](#61-badge-en-el-icono-de-la-extensión), [8.1](#81-persistencia-del-tab-activo), [3.1](#31-página-de-opciones) + [3.2](#32-exportar-e-importar-datos), [1.3](#13-variantes-de-texto-en-campos-i18n), [9.4](#94-refactor-helpers-compartidos), [9.6](#96-automatización-de-subida-a-chrome-web-store), [9.7](#97-refactor-post-extracción-de-módulos), [9.8](#98-accesibilidad-wcag-21-aa) | 3.1 + 3.2 necesarios antes de añadir más configurables |
| 4 — Funcionalidad nueva (reservas) | | [1.1](#11-auto-fetch-en-segundo-plano), [6.2](#62-notificación-al-detectar-cambios-en-auto-fetch), [7](#7-historial-de-fechas) | 6.2 y 7 dependen de 1.1 |
| 5 — Expansión más allá de reservas | | [4.1](#41-enriquecimiento-de-la-tabla-de-favoritos) + [4.2](#42-indicador-de-favorito-en-el-detalle-del-producto), [5.1](#51-resaltar-productos-en-reserva-o-favoritos-en-el-catálogo) – [5.4](#54-historial-de-precios-en-el-detalle-del-producto), [8.2](#82-modo-oscuro), [9.9](#99-mover-github-pages-a-docs) | El alcance más amplio; requiere madurez técnica previa |

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
  - [9.9 Mover GitHub Pages a docs/](#99-mover-github-pages-a-docs)
---

## 1. Auto-fetch de datos del producto

### 1.1 Auto-fetch en segundo plano
Programar una alarma (`chrome.alarms`) que se dispare 1-2 veces al día para obtener datos de productos sin fecha o con enlace roto directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

Puntos a definir:
- Frecuencia exacta (1 o 2 veces al día).
- Si los datos obtenidos se aplican directamente al storage o se guardan como "pendientes" para que el usuario los confirme al entrar a la página.
- El service worker ya tiene `host_permissions` y acceso a cookies, por lo que puede hacer `fetch()` directamente.
- `chrome.alarms` despierta el service worker aunque esté dormido.

### 1.3 Variantes de texto en campos i18n
Los textos `comingSoon` y `availableFrom` se traducen asumiendo un formato fijo. Si Pixelatoy cambia o añade variantes de estos textos, la traducción fallará silenciosamente y se mostrará el texto en el idioma original. Revisar y ampliar los mapeos en `translateAvailableFrom` y `translateComingSoon` en `i18n.js` si se detectan nuevas variantes.

---

## 2. Tabla de reservas

### 2.2 Fusión de columnas Precio y Pagado
Las columnas "Precio" (valor del artículo) y "Pagado" (depósito de reserva) son candidatas a agruparse en una sola sin perder información. El importe pendiente de pago es precio − depósito.

Opciones valoradas:
- **A)** `Precio / Pagado` — dos valores en la misma celda separados por `/`. Ej: `59,99 € / 10,00 €`.
- **B)** `Precio (−depósito)` — precio total con el depósito como deducción entre paréntesis. Ej: `59,99 € (−10,00 €)`.
- **C)** `Pendiente / Total` — calcula y muestra el importe pendiente (precio − depósito) y el total. Ej: `49,99 € / 59,99 €`. Requiere JS para la resta.
- **D)** Dos líneas en la misma celda: precio grande, depósito pequeño debajo (`dep. 10,00 €`).
- **E)** Mostrar solo el **pendiente de pago** en la celda con el desglose completo en tooltip al hacer hover (`Total: 59,99 € · Depósito: 10,00 €`). Requiere JS para calcular la resta.
- **F)** Precio y depósito en línea separados por punto medio: `59,99 € · dep. 10,00 €`.

Las opciones D y E son las más interesantes. E es la más limpia: muestra lo accionable y esconde el detalle hasta que se necesita.

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

**🟡 Legibilidad**
- El patrón `new Promise(resolve => chrome.storage.local.get(STORAGE_KEY, res => resolve(...)))` se repite varias veces. Extraer como `getStorage()` en `helpers.js`. Requiere convertir todos los callbacks a `async/await`, lo que implica refactorizar bastante lógica. Pendiente de abordar con más calma.

### 9.6 Automatización de subida a Chrome Web Store
Usar la [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api) para automatizar el envío a revisión tras cada release, ya sea desde GitHub Actions o desde un script local (`npm run deploy`). Requiere configurar credenciales OAuth2 (`CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`). La publicación final sigue dependiendo de la revisión manual de Google.

### 9.7 Refactor post-extracción de módulos

Mejoras de calidad interna detectadas en la auditoría posterior a la extracción de módulos. Ninguna bloquea funcionalidad, pero reducen fragilidad y facilitan futuros cambios (i18n, tabs, opciones).

**Centralizar constantes compartidas en `constants.js`**

Constantes repartidas entre `helpers.js`, `column.js`, `sort.js` y `orphans.js`. Crear `src/modules/constants.js` para las constantes usadas por más de un módulo (STORAGE_KEY, THRESHOLDS, MONTHS, COLUMN_INDEX_KEY, DATA_INSERT, INSERT_COLUMN_INDEX). Las constantes locales (SORTABLE_COLUMNS) se quedan donde están.

**Eliminar inyección de dependencias entre módulos**

`refreshAllData` recibe 8 dependencias como objeto desde `content.js`; `fetchDateFromProduct` recibe `normalizeDateTime` como parámetro; `addLegend` recibe `refreshAllData` como parámetro. Solución: mover `normalizeDateTime` (y `parseNaturalDate`) a `helpers.js`, de modo que `fetch.js` y `refresh.js` lo importen directamente. Después, `refresh.js` importa `getRowKey`, `saveToStorage`, etc. de `column.js`; `legend.js` importa `refreshAllData` de `refresh.js`. Resultado: `content.js` pierde el wrapper y toda la fontanería de inyección.

**Duplicación de código: `COLUMN_INDEX_KEY` y `getRowKey`**

Definidos dos veces con la misma lógica: en `column.js` y en `orphans.js`. Exportar solo desde `column.js` (o `constants.js`) e importar en `orphans.js`.

**`saveToStorage` — lectura + escritura en cada llamada**

Cada llamada hace `get` + `set`. En operaciones en lote (aceptar todos los cambios del refresh) genera N lecturas innecesarias. Un write-through cache que mantenga el estado en memoria y sincronice sería más eficiente.

**Estilos inline — mantenibilidad**

Decenas de `style.cssText = "..."` repartidos por los módulos dificultan cambiar el diseño. Definir todas las clases en el CSS centralizado y asignar `className` en lugar de `style.cssText`.

**`normalizeDateTime` + `parseNaturalDate` — complejidad ciclomática alta**

7 ramas condicionales en total. Difícil razonar sobre qué formatos acepta. Un array de `[regex, handler]` haría el código más declarativo y extensible.

**Estado global implícito en `sort.js`**

`sortState` es una variable suelta a nivel de módulo. Si en el futuro hay varias tablas independientes, esto podría romper. Pasar el estado como argumento o encapsularlo lo haría más robusto.

**`column.js` sigue siendo grande (~270 líneas)**

Mezcla parsing de fechas, UI helpers, storage y orquestación de columna + auto-fetch. Si crece más (i18n, tabs), candidatos a extraer: `date-parse.js`, `storage.js`.

### 9.8 Accesibilidad (WCAG 2.1 AA)

Auditoría realizada. Hallazgos pendientes:

**Contraste de color**
- `urgency-low` (`#5cb85c` + `#000`) ratio 4.47:1, cumple AA justo pero falla AAA. Valorar oscurecer el verde.

**Enlaces en filas con urgencia**
- Actualmente solo distinguibles por `font-weight: bold`. Cumple WCAG 1.4.1 (información no solo por color). Valorar si se necesita refuerzo adicional en el futuro.

**Celdas editables**
- Sin `role="textbox"` ni `aria-label`. Añadir atributos ARIA para informar a lectores de pantalla.
- Placeholder vía `::before` no leído universalmente. Añadir `aria-placeholder`.

**Toggles colapsables (instrucciones, orphans, popup)**
- Implementados con `<strong>` + click. Usar `<button>` con `aria-expanded` y `tabindex="0"`.

**Overlays dinámicos**
- Overlays de carga e info sin `role="alert"` ni `aria-live`. Añadir regiones live para anunciar cambios.

**Botones con solo icono**
- "✓" y "✗" en overlays de refresh necesitan `aria-label`.
- "✕" en botones de borrado en orphans necesita `aria-label`.

**Popup**
- Imágenes de producto sin `alt` (solo `title`). Añadir `alt` descriptivo.
- Dots de color sin texto alternativo. Añadir `aria-label` o texto oculto.

### 9.9 Mover GitHub Pages a `docs/`
Actualmente `privacy.html` está en `src/` pero se sirve vía GitHub Pages, no forma parte del bundle. Moverla a `docs/` y añadir un `index.html` mínimo (landing con enlace a la Chrome Web Store, política de privacidad y enlaces al repo para README/CHANGELOG). No duplicar contenido de los markdowns: enlazar a GitHub directamente.
