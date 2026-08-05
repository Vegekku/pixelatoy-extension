# Mejoras pendientes

## Priorización

| Bloque | Descripción | Puntos | Notas |
|--------|-------------|--------|-------|
| 3 — Mejoras sobre lo que ya existe | | [2.2](#22-fusión-de-columnas-precio-y-pagado), [3.1](#31-campo-de-entrada-de-fecha-editable-o-de-solo-lectura), [3.2](#32-introducción-manual-de-la-fecha-de-disponibilidad-estimada), [6.1](#61-badge-en-el-icono-de-la-extensión), [1.3](#13-variantes-de-texto-en-campos-i18n), [9.4](#94-refactor-helpers-compartidos), [9.6](#96-automatización-de-subida-a-chrome-web-store), [9.7](#97-refactor-post-extracción-de-módulos), [9.8](#98-accesibilidad-wcag-21-aa), [9.9](#99-testing-automatizado) | |
| 4 — Funcionalidad nueva (reservas) | | [1.1](#11-auto-fetch-en-segundo-plano), [6.2](#62-notificación-al-detectar-cambios-en-auto-fetch), [6.4](#64-añadir-al-carrito-desde-el-popup), [6.5](#65-notificaciones-configurables-por-tipo-de-aviso), [7](#7-historial-de-fechas) | 6.2, 6.5 y 7 dependen de 1.1 |
| 5 — Expansión más allá de reservas | | [4.1](#41-enriquecimiento-de-la-tabla-de-favoritos) + [4.2](#42-indicador-de-favorito-en-el-detalle-del-producto), [5.1](#51-resaltar-productos-en-reserva-o-favoritos-en-el-catálogo) – [5.4](#54-historial-de-precios-en-el-detalle-del-producto), [8.2](#82-modo-oscuro), [8.3](#83-efecto-pulso-en-filas-con-cambios-directos), [9.10](#910-canal-de-soporte-para-usuarios-sin-cuenta-github), [9.11](#911-mover-github-pages-a-docs), [9.12](#912-clase-reserva), [9.13](#913-iconos-font-awesome-propios-subconjunto) | El alcance más amplio; requiere madurez técnica previa |

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

Programar alarmas (`chrome.alarms`) que se disparen 2 veces al día para obtener datos de productos directamente desde el service worker, sin necesidad de tener la página de reservas abierta.

> **Estado: diseño completado, pendiente de implementar.**

#### Flujo de estados de un producto

```
availableFrom/availableFromDate → comingSoon → date (entrada en almacén)
```

El flujo es irreversible: un producto nunca retrocede de estado. El dato más reciente siempre es el más avanzado, lo que simplifica la lógica de conflictos.

#### Qué se fetchea

El auto-fetch replica exactamente la misma información que el botón "Refrescar datos". Por producto, dos fetches encadenados:

1. **Fetch 1 → URL del pedido** (`resolveProductUrl`): solo si no hay `productUrl` guardada. Extrae la `productUrl` de la página de detalle del pedido.
2. **Fetch 2 → URL del producto** (`fetchDateFromProduct`): extrae `date`, `comingSoon`, `availableFrom`, `availableFromDate`, `brokenLink`.

`img` **no** se obtiene con fetch: se extrae del DOM de la página de reservas y no está disponible desde el service worker.

#### Aplicación de cambios: directo vs. pendiente

| Campo | Aplicación |
|---|---|
| `productUrl` | Directa (rellena hueco) |
| `brokenLink` | Directa siempre (dato técnico, sin confirmación) |
| `availableFrom` / `availableFromDate` | Pendiente si cambia respecto al valor guardado |
| `comingSoon` | Pendiente si cambia respecto al valor guardado |
| `date` | Pendiente si cambia respecto al valor guardado |

> **Ejemplos de cambios pendientes (revisados):**
>
> **Directos** (transición hacia adelante en el flujo, `null` → valor o avance de estado):
> - `comingSoon` aparece por primera vez: `null` → "llegada en 2 semanas"
> - `date` aparece por primera vez: `null` → "2026-01-15 00:00" — caso especial del badge, ver [6.1](#61-badge-en-el-icono-de-la-extensión)
> - `availableFrom` desaparece y aparece `comingSoon`: avance de estado
> - `comingSoon` desaparece y aparece `date`: avance de estado
>
> **Pendientes** (cambio en un valor ya existente, incluidos retrocesos o anomalías):
> - `availableFrom` cambia: "enero 2026" → "marzo 2026" — Pixelatoy retrasó la fecha estimada
> - `availableFrom` cambia: "enero 2026" → "febrero 2026" — Pixelatoy adelantó la fecha estimada
> - `comingSoon` cambia: "llegada en 2 semanas" → "llegada en 1 mes"
> - `date` cambia de un valor a otro — Pixelatoy corrigió la fecha de entrada en almacén
> - `availableFrom` desaparece sin que aparezca `comingSoon` ni `date` — posible anomalía en Pixelatoy
>
> **Patrón**: directo si es transición hacia adelante en el flujo irreversible; pendiente si es cualquier cambio en un valor ya existente, independientemente de si avanza o retrocede.

Los cambios pendientes se guardan en una clave separada `pixelatoyPending` en storage, con la misma estructura por producto. Al entrar a la página, se muestran usando el mecanismo de overlays por fila ya existente (igual que el refresh manual).

Si llegan nuevos datos del auto-fetch mientras hay pendientes sin confirmar, los nuevos sobreescriben los anteriores en `pixelatoyPending` (el dato más reciente siempre gana, dado el flujo irreversible).

> **Alternativa en estudio (no decidida):** en lugar de sobreescribir, acumular una lista de cambios distintos por producto (cola FIFO). El usuario confirmaría/cancelaría uno a uno, apareciendo un nuevo overlay en la fila tras cada acción. Permitiría ver la evolución completa de un producto mientras el usuario no estaba. Añadir un botón "aceptar todos" para vaciar la cola de golpe con el valor más reciente. Implicaría cambiar la estructura de `pixelatoyPending` de `{ producto: { campo: valor } }` a `{ producto: [{ campo: valor, fetchedAt: timestamp }, ...] }` y complicaría la UI de confirmación. Pendiente de decidir si aporta suficiente valor respecto a la complejidad añadida.

#### Notificación de cambios pendientes

Cuando el auto-fetch detecta cambios pendientes:
- **Notificación push** al usuario.
- **Badge rojo** en el icono de la extensión (ver sección badge más abajo).

#### Mostrar cambios pendientes al entrar a la página

- **Banner global** encima de la tabla: "Hay X cambios pendientes de confirmar". Visible independientemente del tab activo o de si las tabs están desactivadas. Desaparece al resolver todos los pendientes.
- **Overlay por fila**: mismo mecanismo que el refresh manual. Aparece automáticamente al cargar la página si hay pendientes.
- **Badge en pestañas**: indica cuántas filas de cada tab tienen cambios pendientes. También se activa con el refresh manual (mejora independiente con sentido propio). Solo aplica si las tabs están activadas.

#### Badge en el icono de la extensión

Ver diseño completo en [6.1](#61-badge-en-el-icono-de-la-extensión). El auto-fetch es el origen de los avisos de tipo "pendientes" y "nueva entrada en almacén" descritos en ese punto.

#### Frecuencia y configuración

- 2 disparos al día a horas fijas, por defecto **14:00 y 22:00** (cubre el horario de Pixelatoy: 8-14 y 17-21).
- Configurable desde opciones: el usuario puede cambiar las dos horas.
- Si el usuario configura la misma hora en ambos campos: se ejecuta solo una vez, y se muestra un aviso constante en opciones mientras sean iguales.
- Toggle en opciones para activar/desactivar el auto-fetch completamente, sin perder la configuración de horas.
- Implementación con `chrome.alarms` usando `when` para hora exacta, recalculando el próximo disparo en cada ejecución.

#### Compensación si el navegador estaba cerrado

Se guarda en storage el timestamp del último auto-fetch ejecutado (`pixelatoyConfig.lastAutoFetch`). En `chrome.runtime.onStartup`, se compara ese timestamp con las horas configuradas: si alguna hora programada no se ejecutó desde el último fetch, se lanza inmediatamente.

- Ejemplo: horas 14:00 y 22:00, navegador abierto a las 23:30, último fetch ayer 22:00 → ejecutar ahora y actualizar timestamp.
- Ejemplo: usuario reinicia el navegador a las 14:05 habiendo ejecutado a las 14:00 → no ejecutar, esperar a las 22:00.

#### Cambios en storage

- Nueva clave `pixelatoyPending`: misma estructura por producto que `pixelatoyTexts`, contiene los cambios pendientes de confirmar.
- `pixelatoyConfig.lastAutoFetch`: timestamp ISO del último auto-fetch ejecutado.
- `pixelatoyConfig.autoFetch`: booleano, activa/desactiva el auto-fetch (por defecto `true`).
- `pixelatoyConfig.autoFetchHours`: array de 2 strings `["HH:MM", "HH:MM"]`, horas de disparo (por defecto `["14:00", "22:00"]`).

#### Ficheros afectados (estimación)

- `src/background.js` — lógica principal del auto-fetch, alarmas, compensación en onStartup, badge
- `src/helpers.js` — constante nueva `PENDING_KEY`, posiblemente `lastAutoFetch`
- `src/options.html` / `src/options.js` — nueva sección de configuración del auto-fetch
- `src/modules/refresh.js` — reutilizar o adaptar para aplicar pendientes al cargar la página
- `src/content.js` — mostrar banner global y overlays de pendientes al cargar
- `src/popup.html` / `src/popup.js` — efecto pulso en urgentes y en botón de reservas
- `src/content.css` — estilos del banner global y badge en pestañas
- `src/migrations.js` — migración para añadir `autoFetch`, `autoFetchHours`, `lastAutoFetch` a config existente

### 1.3 Variantes de texto en campos i18n
Los textos `comingSoon` y `availableFrom` se traducen asumiendo un formato fijo. Si Pixelatoy cambia o añade variantes de estos textos, la traducción fallará silenciosamente y se mostrará el texto en el idioma original. Revisar y ampliar los mapeos en `translateAvailableFrom` y `translateComingSoon` en `i18n.js` si se detectan nuevas variantes.

---

## 2. Tabla de reservas

### 2.1 Barra de progreso global en auto-fetch y refresh

Al cargar la página (auto-fetch) o al pulsar "Refrescar datos", mostrar una barra de progreso global encima de la tabla que indique cuántas filas quedan pendientes de respuesta. Se actualiza conforme cada fila termina su fetch.

- Formato sugerido: barra visual + texto `X / N filas` o similar.
- Desaparece al completarse todas las filas.
- Aplica tanto al auto-fetch inicial como al refresh manual.

Además, añadir un badge en cada pestaña ("En almacén" / "No disponible") con el número de filas de esa pestaña que aún tienen overlay de carga activo. Se actualiza conforme terminan.

Ficheros afectados: `src/modules/column.js`, `src/modules/refresh.js`, `src/modules/tab.js`, `src/content.css`.

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

### 3.1 Campo de entrada de fecha editable o de solo lectura

Ahora que la fecha de entrada en almacén se obtiene automáticamente via auto-fetch, añadir una opción en la página de opciones para controlar si el campo de la columna "En almacén" es editable por el usuario o de solo lectura.

- **Editable** (por defecto): comportamiento actual, el usuario puede introducir o modificar la fecha manualmente.
- **Solo lectura**: la celda muestra el valor obtenido automáticamente sin permitir edición directa. Útil para usuarios que prefieren confiar exclusivamente en el auto-fetch y evitar modificaciones accidentales.

Ficheros afectados: `src/options.html`, `src/options.js`, `src/modules/column.js`, `src/helpers.js`, `src/migrations.js`.

### 3.2 Introducción manual de la fecha de disponibilidad estimada

Actualmente `availableFrom` y `availableFromDate` solo se obtienen leyendo la página del producto via fetch. Permitir al usuario introducir o corregir manualmente la fecha de disponibilidad estimada desde la tabla, de forma similar a como se edita la fecha de entrada en almacén.

Puntos a definir:
- Dónde mostrar el campo editable: en la misma celda de la columna "En almacén" cuando el producto está en estado `availableFrom` (sin `date`), o en una celda separada.
- Cómo distinguir visualmente un valor introducido manualmente de uno obtenido por auto-fetch (ej. icono o estilo diferente).
- Qué ocurre si el auto-fetch obtiene un valor diferente al introducido manualmente: tratarlo como cambio pendiente igual que con `date`.

Ficheros afectados: `src/modules/column.js`, `src/modules/refresh.js`, `src/content.css`.

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

Badge rojo en el icono que indica al usuario que hay algo que atender, sin necesidad de abrir el popup.

**Qué representa el número**

El badge muestra cuántos tipos de aviso hay activos simultáneamente (máximo 2):
- **Urgentes**: productos con límite de almacén próximo (según umbrales configurados).
- **Pendientes**: cambios del auto-fetch sin confirmar.

**Comportamiento por tipo**

| Tipo | Aparece cuando | Desaparece cuando | Efecto en popup |
|---|---|---|---|
| Urgentes | Hay productos dentro del umbral de urgencia | La urgencia desaparece (producto enviado o fecha actualizada) | Pulso en la sección de urgencia |
| Pendientes | El auto-fetch detecta cambios pendientes de confirmar | El usuario confirma o cancela todos los pendientes | Pulso en el botón, texto cambia a "Cambios en reservas" |
| Nueva entrada en almacén | `null` → `date` | El usuario abre el popup o accede a reservas | Pulso en la imagen/entrada concreta del producto |
| Próxima llegada | `null` → `comingSoon` | El usuario abre el popup o accede a reservas | Pulso en la entrada concreta del producto |
| Avance de estado | `availableFrom` → `comingSoon` o `comingSoon` → `date` | El usuario abre el popup o accede a reservas | Pulso en la entrada concreta del producto |
| Enlace reparado | `brokenLink` `true` → `false` | El usuario abre el popup o accede a reservas | Sin efecto en popup (no aparece en popup) |

Si hay urgentes y pendientes a la vez: badge muestra 2, pulsan ambas secciones del popup simultáneamente. Los tipos de aviso activos son configurables individualmente desde opciones (ver [6.5](#65-notificaciones-configurables-por-tipo-de-aviso)). El efecto pulso en la fila de la tabla está cubierto en [8.3](#83-efecto-pulso-en-filas-con-cambios-directos).

**Con popup desactivado**

El badge se muestra igualmente. Al hacer click se abre la página de reservas (ver [6.3](#63-abrir-reservas-al-pulsar-el-icono-con-popup-desactivado)), donde el usuario ve el banner y los overlays de pendientes. El badge desaparece al acceder a la página de reservas (para pendientes) o al resolverse la urgencia (para urgentes).

**Implementación**

`chrome.action.setBadgeText` y `chrome.action.setBadgeBackgroundColor` desde `background.js`. Se actualiza al ejecutar el auto-fetch y al recibir cambios en `chrome.storage.onChanged`.

Ficheros afectados: `src/background.js`.

### 6.2 Notificación al detectar cambios en auto-fetch
Cuando el auto-fetch en segundo plano (punto 1.1) detecta que un producto ha cambiado de estado, lanzar una notificación push al usuario sin que tenga que abrir la página.

- El badge del icono refleja el aviso (ver diseño completo en [1.1](#11-auto-fetch-en-segundo-plano)).
- Al abrir el popup, efecto de pulso en la nueva entrada o en el botón de reservas según el tipo de cambio. El badge desaparece en el momento en que el usuario abre el popup o accede a la página de reservas.
- Depende de que el punto 1.1 esté implementado.

### 6.4 Añadir al carrito desde el popup
La tabla de reservas incluye un formulario por cada producto en almacén para añadirlo al carrito. Replicar esa funcionalidad desde el popup para que el usuario pueda añadir al carrito sin abrir la página de reservas.

Puntos a definir:
- El formulario de la tabla tiene campos ocultos (token, id de producto, cantidad, etc.). Hay que identificarlos inspeccionando el HTML de la página de reservas para replicarlos en el popup.
- Al añadir al carrito con éxito, cambiar el botón de acción o añadir uno nuevo para ir al carrito directamente.
- Si el envío falla (sesión expirada, producto ya no disponible), mostrar un mensaje de error en el popup.
- Solo aplica a productos en estado `date` (en almacén con formulario de envío). Los productos sin fecha no tienen formulario.

Ficheros afectados: `src/popup.html`, `src/popup.js`, posiblemente `src/background.js` para delegar el POST si hay restricciones de CORS.

### 6.5 Notificaciones configurables por tipo de aviso

El usuario puede activar/desactivar individualmente cada tipo de aviso desde opciones. Cada tipo puede notificar via badge, push y/o pulso en el popup y en la fila de reservas.

**Tipos disponibles:**

| Tipo | Cambio que lo origina | Por defecto |
|---|---|---|
| Urgentes | Límite de almacén próximo | ✅ activado |
| Cambios pendientes | Valor existente modificado | ✅ activado |
| Nueva entrada en almacén | `null` → `date` | ✅ activado |
| Próxima llegada | `null` → `comingSoon` | ✅ activado |
| Avance de estado | `availableFrom` → `comingSoon`, `comingSoon` → `date` | ✅ activado |
| Enlace reparado | `brokenLink` `true` → `false` | ⬜ desactivado |

**Pulso en fila de reservas**

Todos los tipos generan un pulso en la fila correspondiente la primera vez que el usuario entra tras el cambio, usando `pixelatoyAnnounce` en storage (ver [8.3](#83-efecto-pulso-en-filas-con-cambios-directos)).

**Cambios en storage**

`pixelatoyConfig.announceTypes`: objeto con un booleano por tipo de aviso.
Nueva clave `pixelatoyAnnounce`: misma estructura por producto que `pixelatoyTexts`, contiene flags temporales de anuncio pendiente. Al mostrarse el pulso, el flag se elimina.

Ficheros afectados: `src/background.js`, `src/content.js`, `src/options.html`, `src/options.js`, `src/helpers.js`, `src/migrations.js`.

---

## 7. Historial de fechas

Guardar un log de las fechas que ha tenido cada producto: fecha estimada de disponibilidad (según auto-fetch) y fecha real de entrada en almacén. Permite ver si Pixelatoy cumple sus plazos estimados.

Puntos a definir:
- Dónde mostrar el historial (tooltip en la celda, sección en la página de opciones, etc.).
- Límite de entradas por producto para no crecer indefinidamente el storage.

---

## 8. UX

### 8.2 Modo oscuro
Respetar `prefers-color-scheme: dark` en los elementos que inyecta la extensión: leyenda, instrucciones de uso y sección de orphans. Los colores de las filas de la tabla ya son configurables (punto 3.1) y quedan fuera de este alcance.

### 8.3 Efecto pulso en filas con cambios directos
Cuando el auto-fetch detecta un cambio directo (ver [6.5](#65-notificaciones-configurables-por-tipo-de-aviso)), aplicar un efecto de pulso a la fila correspondiente la primera vez que el usuario accede a la página de reservas tras el cambio. El efecto se muestra solo una vez: al mostrarse, se elimina el flag de `pixelatoyAnnounce` para ese producto.

Implementación: al cargar la página, si existe una entrada en `pixelatoyAnnounce` para un producto, aplicar la animación CSS a su fila y eliminar el flag. El estado por defecto (sin entrada) es "ya visto".

Ficheros afectados: `src/content.js`, `src/content.css`, `src/modules/column.js`.

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

**Duplicación de lógica: cálculo de URL efectiva del producto**

La expresión `brokenLink ? null : (resolvedUrl || productUrl)` aparece en `applyCustomColumn` (`column.js`) y en `checkOrphanData` (`orphans.js`). Candidata a extraerse como `getEffectiveUrl(entry)` en `helpers.js`. Si se implementa la clase `Reserva` ([9.12](#912-clase-reserva)), encajaría directamente como el getter `detailUrl`.

Además, en `applyCustomColumn` la expresión tiene un `?? entry.productUrl` de fallback que los demás usos no tienen: si `brokenLink` es `true`, el `null` queda anulado por el `??` y se devuelve `productUrl` igualmente. Revisar si es intencional o un bug.

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

**Validación de datos — posible módulo `validation.js`**

Actualmente `validateImportData()` y los schemas (`PRODUCT_SCHEMA`, `CONFIG_SCHEMA`) viven en `options.js` porque es el único punto que los usa. Si otros flujos necesitan validar la misma estructura (auto-fetch en segundo plano [1.1], migraciones futuras, sync entre perfiles), extraer a `src/validation.js` con los schemas y la función exportada. No hacerlo antes de que haya reutilización real.

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

### 9.9 Testing automatizado

Añadir tests unitarios y de integración para la extensión. Stack recomendado: Vitest + happy-dom (ligero, rápido, compatible con esbuild).

**Tipos de test y ROI**

| Tipo | Herramienta | ROI | Cuándo |
|---|---|---|---|
| Unitarios (lógica pura) | Vitest | ⭐⭐⭐ Alto | Primera fase — sin dependencias de Chrome ni DOM |
| Unitarios (DOM + Chrome mocks) | Vitest + happy-dom + jest-chrome | ⭐⭐ Medio | Segunda fase — módulos con storage o DOM |
| Integración E2E | Playwright + extensión en Chromium real | ⭐ Bajo/Alto coste | Fase posterior — flujos completos |

El mayor ROI está en cubrir el parseo de fechas y las migraciones: son los puntos donde un bug silencioso puede corromper datos del usuario sin que se note hasta tarde.

**Setup necesario**
- Configurar Vitest con happy-dom como entorno DOM.
- Crear mock global de `chrome.storage.local` (get/set/remove) y otras Chrome APIs usadas (alarms, notifications, action).
- Script `npm test` y `npm run test:watch`.
- Job en GitHub Actions: ejecutar `npm run dev:build` + `npm test` en cada push a `develop`.

**Módulos prioritarios (primera fase — lógica pura, sin mocks)**
- `helpers.js` — `normalizeDateTime`, `parseNaturalDate`, `remainingTime`, `urgencyLevel`. Sin dependencias externas, testeable directamente.
- `i18n.js` — `t()`, `getLang()`, `thresholdLabel()`. Verificar traducciones y fallback a inglés.
- `migrations.js` — cada migración con storage en estado anterior y verificar estado posterior.
- `modules/sort.js` — lógica de ordenación. Estado aislado, buen candidato.

**Módulos de segunda fase (requieren mocks)**
- `options.js` — `readForm()`, `populateForm()`, `renderThresholds()`, `applyLabels()`. Requiere montar HTML de `options.html` en el entorno de test.
- `modules/fetch.js` — parsing de HTML de producto. Mockear `fetch` con fixtures HTML.

**Refactors previos necesarios**
- Exportar funciones internas de `options.js` (`readForm`, `populateForm`, etc.) para poder importarlas en tests.
- Extraer lógica pura de módulos acoplados al DOM para facilitar testing aislado.

**Tests de integración (fase posterior)**
- Puppeteer/Playwright con la extensión cargada para flujos completos (abrir options, guardar, verificar storage; cargar página de reservas, comprobar columna inyectada).

### 9.10 Canal de soporte para usuarios sin cuenta GitHub

Actualmente el único canal para reportar problemas es la lista de issues de GitHub, que requiere cuenta. Explorar alternativas accesibles para cualquier usuario:

- **Formulario web**: Google Forms o similar embebido/enlazado desde la página de opciones. Sin exposición del email, sin spam directo.
- **Email con alias**: usar un alias (ej. SimpleLogin, Fastmail) para no exponer el correo personal y poder desactivarlo si hay abuso.

Lo que se elija se añade en la sección **Acerca de** de la página de opciones junto al enlace a issues.

### 9.11 Mover GitHub Pages a `docs/`
Actualmente `privacy.html` está en `src/` pero se sirve vía GitHub Pages, no forma parte del bundle. Moverla a `docs/` y añadir un `index.html` mínimo (landing con enlace a la Chrome Web Store, política de privacidad y enlaces al repo para README/CHANGELOG). No duplicar contenido de los markdowns: enlazar a GitHub directamente.

### 9.12 Clase `Reserva`

Crear una clase `Reserva` en `src/reserva.js` que encapsule los datos de cada producto en storage y centralice la lógica de acceso repetida actualmente en `column.js`, `orphans.js`, `refresh.js`, `popup.js` y `helpers.js`.

**Ubicación:** `src/reserva.js` — al mismo nivel que `helpers.js` e `i18n.js`, ya que es una abstracción de datos compartida por content, popup y background. Si en el futuro aparece un segundo modelo (ej. `Favorito`), mover ambos a `src/models/`.

**Getters propuestos:**

| Getter | Lógica actual duplicada | Retorna |
|---|---|---|
| `detailUrl` | `resolvedUrl \|\| productUrl` adaptada al idioma | `string\|null` |
| `limitDate` | `addThreeMonths(entry.date)` | `string\|null` |
| `isAvailable` | `!!entry.date` | `boolean` |
| `statusText` | lógica de countdown / comingSoon / availableFrom / vacío | `string` |

**Ciclo de vida con storage:**
- Al leer: `new Reserva(entry)` — hidrata y sanea campos opcionales (`entry?.date`, `entry?.productUrl`, etc.)
- Al escribir: `reserva.toJSON()` — serializa a objeto plano para `chrome.storage.local.set`

**Ficheros afectados:**
- `src/reserva.js` — nuevo módulo
- `src/helpers.js` — `groupByThreshold` usa `limitDate`
- `src/modules/column.js` — `updateCell`, `autoFetchRowData`, `applyCustomColumn`
- `src/modules/orphans.js` — renderizado de cada orphan
- `src/modules/refresh.js` — `refreshRowData`
- `src/popup.js` — `groupByThreshold`

### 9.13 Iconos Font Awesome propios (subconjunto)

Actualmente los iconos FA se toman de la hoja de estilos que carga Pixelatoy, lo que funciona en la tabla de reservas pero no en `options.html`. Bundlear un subconjunto mínimo de la fuente con solo los glifos usados por la extensión.

**Glifos necesarios actualmente:**
- `U+F127` — `fa-chain-broken` (enlace roto)
- `U+F074` — `fa-random` (URL resuelta)

**Herramientas para generar el subconjunto:**
- [`pyftsubset`](https://fonttools.readthedocs.io/en/latest/subset/index.html) (Python, parte de `fonttools`):
  ```bash
  pyftsubset fontawesome-webfont.woff2 \
    --unicodes="U+F074,U+F127" \
    --flavor=woff2 \
    --output-file=icons/fa-subset.woff2
  ```
- [`glyphhanger`](https://github.com/zachleat/glyphhanger) (Node):
  ```bash
  npx glyphhanger --formats=woff2 --subset=fontawesome-webfont.woff2 --unicodes="U+F074,U+F127"
  ```
- Alternativas online sin instalar nada:
  - [Font Squirrel Webfont Generator](https://www.fontsquirrel.com/tools/webfont-generator) — subir el woff2 y seleccionar glifos por Unicode
  - [Transfonter](https://transfonter.org/) — similar, permite especificar rangos Unicode

**Implementación:**
- Guardar el woff2 generado en `icons/fa-subset.woff2`
- Añadir `@font-face` en un CSS compartido (o en `options.css` si se crea) apuntando a la ruta relativa
- Añadir solo las clases `.fa`, `.fa-chain-broken::before` y `.fa-random::before` necesarias
- En `content.css` seguir usando la fuente de Pixelatoy (ya disponible en la página); el subconjunto solo es necesario en `options.html`
