# Spec: Resolución automática de enlaces rotos por referencia

> Documento temporal de especificación. Eliminar tras implementar y cerrar la feature.

---

## Contexto

Las URLs de productos en Pixelatoy cambian cuando el artículo pasa de preventa activa a catálogo general. La URL guardada en storage (`productUrl`) deja de ser válida y se detecta como enlace roto (`brokenLink: true`).

Ejemplos observados:

| URL original (pedido) | URL nueva (catálogo) |
|---|---|
| `.../61221-51365-marco-marineford-...-4573102692993.html` | `.../61222-marco-marineford-...-4573102692993.html` |
| `.../63423-55353-nail-...-4573102687463.html` | `.../67441-61968-nail-...-4573102687463.html` |

Patrón observado: la URL con **dos números iniciales** (`67441-61968`) indica que el artículo sigue reservable; con **un número inicial** (`61222`) ya no. En ambos casos la referencia (último número largo) es la misma y sirve para localizar la nueva URL.

---

## Solución

Cuando se detecta `brokenLink: true`, intentar resolver la nueva URL automáticamente usando la API de búsqueda de Pixelatoy por referencia del producto.

### Campo nuevo en storage

`resolvedUrl` — URL encontrada por búsqueda. **`productUrl` nunca se modifica** (se conserva por si la URL original se reactiva).

Estructura del entry en storage tras la feature:

```js
{
  date, img, productUrl,      // existentes, sin cambios
  brokenLink,                 // existente
  resolvedUrl,                // NUEVO: URL resuelta por búsqueda, o null
  availableFrom, availableFromDate, comingSoon  // existentes
}
```

### API de búsqueda

```
GET https://www.pixelatoy.com/{lang}/module/ambjolisearch/jolisearch
    ?s={referencia}&ajax=true&use_rendered_products=false
```

- `{lang}`: extraído de `productUrl` (`es` o `en`), fallback `es`
- `{referencia}`: último número ≥7 dígitos antes de `.html` en `productUrl`

Respuesta JSON: `{ rendered_products: "<html string>" }`

La URL del producto se extrae del primer `<a href="...">` dentro de `.jolisearch-products__list` en el HTML renderizado.

---

## Diagrama de flujo: obtención de datos de un artículo

```
┌─────────────────────────────────────────────────────────────────┐
│                    INICIO: obtener datos                        │
│          (auto-fetch al cargar / refresh manual)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  ¿productUrl en storage? │
              └────────┬────────┬────────┘
                    NO │        │ SÍ
                       │        ▼
                       │  ┌─────────────────────────┐
                       │  │  ¿resolvedUrl en storage?│
                       │  └────────┬────────┬────────┘
                       │        NO │        │ SÍ
                       │           │        │
                       │           │        ▼
                       │           │  [usar resolvedUrl
                       │           │   como URL efectiva]
                       │           │        │
                       ▼           ▼        │
              ┌──────────────────────────┐  │
              │  resolveProductUrl()     │  │
              │  (fetch página pedido    │  │
              │   → buscar enlace al     │  │
              │     producto por nombre) │  │
              └────────────┬─────────────┘  │
                           │                │
              ┌────────────┴────────────┐   │
              │  ¿URL encontrada?       │   │
              └────────┬────────┬───────┘   │
                    NO │        │ SÍ        │
                       │        │           │
                       │        ▼           │
                       │  [guardar          │
                       │   productUrl]      │
                       │        │           │
                       ▼        ▼           ▼
                    [FIN] ┌─────────────────────────────┐
                          │  fetchDateFromProduct(url)   │
                          │  GET página de detalle       │
                          └────────────┬────────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │  ¿página válida?         │
                          │  (h1[itemprop="name"])   │
                          └────────┬────────┬────────┘
                               SÍ │        │ NO → enlace roto
                                  │        │
                                  │        ▼
                                  │  ┌──────────────────────────────┐
                                  │  │  extractReference(productUrl) │
                                  │  │  regex: último nº ≥7 dígitos  │
                                  │  └────────────┬─────────────────┘
                                  │               │
                                  │  ┌────────────┴────────────┐
                                  │  │  ¿referencia extraída?  │
                                  │  └────────┬────────┬────────┘
                                  │        NO │        │ SÍ
                                  │           │        ▼
                                  │           │  ┌──────────────────────────┐
                                  │           │  │  resolveUrlByReference() │
                                  │           │  │  GET jolisearch API      │
                                  │           │  │  → extraer href producto │
                                  │           │  └────────────┬─────────────┘
                                  │           │               │
                                  │           │  ┌────────────┴────────────┐
                                  │           │  │  ¿URL encontrada?       │
                                  │           │  └────────┬────────┬────────┘
                                  │           │        NO │        │ SÍ
                                  │           │           │        ▼
                                  │           │           │  [guardar resolvedUrl]
                                  │           │           │  fetchDateFromProduct
                                  │           │           │  (resolvedUrl)
                                  │           │           │        │
                                  │           │           │  ┌─────┴──────────────┐
                                  │           │           │  │  ¿página válida?   │
                                  │           │           │  └────┬────────┬───────┘
                                  │           │           │    SÍ │        │ NO
                                  │           │           │       │        ▼
                                  │           ▼           ▼       │  [brokenLink: true
                                  │      [brokenLink:true,│       │   resolvedUrl guardada
                                  │       sin resolvedUrl]│       │   para reintento futuro]
                                  │           │           │       │        │
                                  │           └─────┬─────┘       │        │
                                  │                 │             │        │
                                  │              [FIN]            ▼        ▼
                                  │                           [continuar con
                                  │                            parseo de datos]
                                  │                                │
                                  └────────────────────────────────┘
                                                   │
                                                   ▼
                                  ┌────────────────────────────────┐
                                  │  Parsear dt.name de la página  │
                                  └────────────────────────────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                             ┌──────────┐  ┌────────────┐  ┌───────────┐
                             │  date    │  │ comingSoon │  │available  │
                             │ (fecha   │  │ (texto sin │  │From       │
                             │  entrada)│  │  fecha)    │  │(estimada) │
                             └──────────┘  └────────────┘  └───────────┘
```

---

## Cambios por fichero

### `src/modules/fetch.js`

- **`extractReference(url)`** *(nueva, exportada)*
  - Regex: `/-(\d{7,})(?:\.html|$)/i`
  - Devuelve el último número largo o `null`

- **`resolveUrlByReference(reference, lang)`** *(nueva, exportada)*
  - Fetch a la API jolisearch via background
  - Parsea JSON → extrae primer href de producto en `rendered_products`
  - Regex sobre el string HTML: `/href=\\?"(https:\/\/www\.pixelatoy\.com\/[^"\\]+\.html)/`
  - Devuelve URL o `null`

- **`fetchDateFromProduct(productUrl)`** *(modificada)*
  - Extrae lógica de parseo a función interna `parseDateFromHTML(html, url)`
  - Cuando `brokenLink`: llama a `extractReference` + `resolveUrlByReference`
  - Si encuentra `resolvedUrl`: reintenta fetch y parseo con ella
  - Devuelve `resolvedUrl` en el resultado (nuevo campo) en todos los casos

### `src/modules/column.js`

- **`autoFetchRowData`** *(modificada)*
  - URL efectiva para fetch: `stored.resolvedUrl || stored.productUrl`
  - `linkifyProductName` solo se llama si `brokenLink: false`. URL del enlace: `resolvedUrl || productUrl`
  - Si `resolvedUrl`: mostrar icono 🔀 junto al nombre
  - Si `fetchDateFromProduct` devuelve `resolvedUrl`: guardarlo en storage
  - Si `brokenLink: true`: guardar `resolvedUrl` si existe (para reintento en refresh), no linkificar

- **`applyCustomColumn`** *(modificada)*
  - Al restaurar datos del storage, `linkifyProductName` solo se llama si `!stored.brokenLink`. URL del enlace: `stored.resolvedUrl || stored.productUrl`
  - Si `stored.resolvedUrl`: mostrar icono 🔀 junto al nombre

### `src/i18n.js`

- Nueva clave `resolved_link_tooltip`: `"URL actualizada automáticamente"` / `"URL automatically updated"`
- Actualizar clave existente `broken_link_tooltip`: `"El enlace original del producto no está disponible"` / `"The original product link is no longer available"`

### Iconos

Se usa Font Awesome 4.7.0 que ya carga Pixelatoy, sin dependencia adicional en la extensión y sin fallback.

| Estado | Icono FA | Clase |
|---|---|---|
| URL resuelta por búsqueda | `fa-random` | `<i class="fa fa-random">` |
| URL rota sin resolución | `fa-chain-broken` | `<i class="fa fa-chain-broken">` |

### `src/modules/refresh.js`

- **`refreshRowData`** *(modificada)*
  - URL efectiva: `productUrl || resolvedUrl` — primero intenta la original por si se ha reactivado
  - Si `productUrl` vuelve a ser válida: limpiar `brokenLink` y `resolvedUrl` en storage (silencioso, sin overlay)
  - Si `productUrl` sigue rota y hay `resolvedUrl`: reintentar con ella
  - Si `resolvedUrl` es nueva o ha cambiado: guardar en storage (silencioso)
  - El overlay **solo muestra cambios de datos**: fecha, disponibilidad. Los cambios de URL son siempre transparentes para el usuario

---

## Casos de uso cubiertos

| Caso | Comportamiento |
|---|---|
| URL válida desde el inicio | Sin cambios, flujo actual |
| URL rota, referencia extraíble, búsqueda encuentra resultado | Auto-resolución silenciosa, datos obtenidos de `resolvedUrl` |
| URL rota, búsqueda encuentra resultado pero esa URL también es inválida | `brokenLink: true` + `resolvedUrl` guardada, nombre como texto plano con ⛓️💥 |
| URL rota, búsqueda no encuentra resultado | `brokenLink: true`, sin `resolvedUrl`, nombre como texto plano con ⛓️💥 |
| URL rota resuelta en auto-fetch, refresh posterior | Usa `resolvedUrl` guardada directamente, sin repetir búsqueda |
| URL original se reactiva (producto vuelve a preventa) | Refresh detecta que `productUrl` vuelve a ser válida, limpia `brokenLink` y `resolvedUrl` silenciosamente |
| `resolvedUrl` también se rompe en el futuro | Mismo flujo: `brokenLink: true`, se podría reintentar búsqueda |

---

## Decisiones de diseño

- `productUrl` es **inmutable** una vez guardada. Es la fuente de verdad histórica y la que contiene la referencia para búsquedas futuras.
- `resolvedUrl` es **reemplazable**: si en un refresh futuro la búsqueda devuelve una URL diferente, se actualiza silenciosamente.
- Los cambios de URL (resolución, restauración, actualización) son **siempre transparentes** para el usuario. El overlay solo muestra cambios de datos: fecha, disponibilidad.
- El nombre del producto **solo se convierte en enlace si hay una URL funcional** (`brokenLink: false`). La URL usada para el enlace es `resolvedUrl || productUrl`. Si `brokenLink: true`, el nombre se muestra como texto plano con el icono ⛓️💥.
- Cuando la URL funcional es `resolvedUrl` (no la original), se muestra el icono 🔀 junto al nombre con tooltip `"URL actualizada automáticamente"` / `"URL automatically updated"`.
- La búsqueda por referencia solo se lanza cuando `isValidProductPage` falla, nunca de forma preventiva.
- El reintento con `resolvedUrl` dentro de `fetchDateFromProduct` es transparente para los llamadores: reciben el resultado como si la URL original fuera válida, más el campo `resolvedUrl` para que puedan persistirlo.
