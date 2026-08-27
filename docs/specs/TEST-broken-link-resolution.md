# Test: Resolución automática de enlaces rotos

Para cada prueba: pega el comando en **DevTools → Consola** de la página de reservas, recarga, y verifica lo indicado.
Para restaurar el estado original al final, usa el comando del **Anexo**.

---

## Prueba 1 — Regresión: datos completos sin resolvedUrl

Verifica que productos con URL y fecha normales no se ven afectados.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Krillin -Earth's Strongest Man-. SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-07-23 00:00", "img": "https://www.pixelatoy.com/419336-home_default/krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62394-53719-krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z-4573102698711.html#/pago-deposito"
  },
  "Lord Starkiller. The Black Series. Star Wars. Hasbro - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-07-03 00:00", "img": "https://www.pixelatoy.com/444052-home_default/lord-starkiller-the-black-series-star-wars-hasbro.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/65213-58377-lord-starkiller-the-black-series-star-wars-hasbro-5010996367181.html#/pago-deposito"
  }
}})
```

**Qué debes ver tras recargar:**
- Krillin y Lord Starkiller en tab "En almacén" con fecha y color de urgencia
- Nombre de cada uno como enlace a su `productUrl`
- Sin icono 🔀 ni ⛓️💥
- Sin overlay de carga (datos completos, no hay auto-fetch)

---

## Prueba 2 — Restauración desde storage con resolvedUrl (brokenLink: false)

Verifica que al cargar la página se usa `resolvedUrl` como enlace y aparece el icono 🔀.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/67441-nail-sh-figuarts-dragon-ball-z-4573102687463.html"
  }
}})
```

**Qué debes ver tras recargar:**
- Nail en tab "No disponible", disponibilidad estimada septiembre 2026
- Nombre como enlace que apunta a `67441-nail-...` (la `resolvedUrl`, NO la `productUrl`)
- Icono 🔀 junto al nombre con tooltip "URL actualizada automáticamente"
- Sin icono ⛓️💥
- Sin overlay de carga

---

## Prueba 3 — Restauración desde storage con brokenLink: true sin resolvedUrl

Verifica que un enlace roto sin resolución muestra el icono ⛓️💥 y el nombre sin enlace.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Marco Marineford. SH Figuarts. One Piece - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": true, "img": "https://www.pixelatoy.com/409092-home_default/marco-marineford-sh-figuarts-one-piece.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61221-51365-marco-marineford-sh-figuarts-one-piece-4573102692993.html#/pago-deposito"
  }
}})
```

**Qué debes ver tras recargar:**
- Marco Marineford en tab "No disponible"
- Nombre como **texto plano** (sin enlace) con icono ⛓️💥 y tooltip "El enlace original del producto no está disponible"
- Sin icono 🔀
- Overlay de carga mientras intenta resolver por referencia (`4573102692993`). Al terminar, si encuentra URL nueva: enlace + icono 🔀. Si no: sigue con ⛓️💥

---

## Prueba 4 — Auto-fetch: URL rota que se resuelve automáticamente

Verifica el flujo completo de auto-resolución: sin `resolvedUrl` en storage, la extensión lo encuentra sola.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": true, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito"
  }
}})
```

**Qué debes ver tras recargar:**
- Nail en tab "No disponible" con overlay de carga
- Al terminar: nombre con enlace a `67441-nail-...` + icono 🔀
- En storage (`chrome.storage.local.get("pixelatoyTexts", console.log)`): `resolvedUrl` guardado y `brokenLink: false`

---

## Prueba 5 — Auto-fetch: URL rota sin referencia válida (sin resolución posible)

Verifica que una URL sin número de referencia extraíble falla limpiamente.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Piccolo (The Proud Namekian). SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": true, "comingSoon": null,
    "date": null, "img": "https://www.pixelatoy.com/419320-home_default/piccolo-the-proud-namekian-dragon-ball-z-sh-figuarts.jpg",
    "productUrl": "https://www.pixelatoy.com/es/producto-sin-referencia.html"
  }
}})
```

**Qué debes ver tras recargar:**
- Piccolo con overlay de carga breve
- Al terminar: nombre como texto plano + icono ⛓️💥
- Sin icono 🔀, sin enlace
- En storage: `brokenLink: true`, sin `resolvedUrl`

---

## Prueba 6 — Refresh manual: resolvedUrl nueva encontrada (sin resolvedUrl previo)

Verifica que "Refrescar datos" guarda `resolvedUrl` silenciosamente cuando la encuentra por primera vez.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Super Saiyan Son Goku -Fighter Rage-. SH Figuarts. Dragon Ball Z - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en agosto de 2026", "availableFromDate": "2026-08-01 00:00",
    "brokenLink": true, "img": "https://www.pixelatoy.com/410672-home_default/super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61425-51849-super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z-4573102692900.html#/pago-deposito"
  }
}})
```

**Qué debes ver tras recargar y pulsar "Refrescar datos":**
- Sin overlay de cambios visible para el usuario (cambio silencioso)
- En storage tras el refresh: `resolvedUrl` guardado apuntando a `71264-super-saiyan-...` y `brokenLink: false`
- Al recargar la página después: nombre con enlace a `resolvedUrl` + icono 🔀

---

## Prueba 7 — Refresh manual: URL original reactivada (limpiar brokenLink y resolvedUrl)

Verifica que si la `productUrl` original vuelve a ser válida, se limpian `brokenLink` y `resolvedUrl` silenciosamente.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Krillin -Earth's Strongest Man-. SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": true, "comingSoon": null,
    "date": "2026-07-23 00:00", "img": "https://www.pixelatoy.com/419336-home_default/krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62394-53719-krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z-4573102698711.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/99999-url-inventada.html"
  }
}})
```

**Qué debes ver tras recargar y pulsar "Refrescar datos":**
- Sin overlay de cambios visible (cambio silencioso)
- En storage tras el refresh: `brokenLink: false` y `resolvedUrl: null`
- Al recargar: nombre con enlace a `productUrl` original, sin icono 🔀 ni ⛓️💥

---

## Prueba 8 — Refresh manual: cambio de datos con resolvedUrl ya guardado

Verifica que el overlay de cambios muestra solo datos (fecha/disponibilidad), no URLs.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en enero de 2025", "availableFromDate": "2025-01-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/67441-nail-sh-figuarts-dragon-ball-z-4573102687463.html"
  }
}})
```

**Qué debes ver tras recargar y pulsar "Refrescar datos":**
- Overlay de cambios en la fila de Nail mostrando el cambio de disponibilidad (enero 2025 → septiembre 2026)
- El overlay NO menciona URLs ni `resolvedUrl`
- Al aceptar: celda actualizada con la nueva disponibilidad

---

## Prueba 9 — Ordenación tras resolver enlace

Verifica que `getRowKey` sigue leyendo el nombre correctamente después de que el auto-fetch haya sustituido el enlace.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": true, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito"
  },
  "Marco Marineford. SH Figuarts. One Piece - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": true, "img": "https://www.pixelatoy.com/409092-home_default/marco-marineford-sh-figuarts-one-piece.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61221-51365-marco-marineford-sh-figuarts-one-piece-4573102692993.html#/pago-deposito"
  },
  "Krillin -Earth's Strongest Man-. SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-07-23 00:00", "img": "https://www.pixelatoy.com/419336-home_default/krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62394-53719-krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z-4573102698711.html#/pago-deposito"
  }
}})
```

**Qué debes ver tras recargar:**
1. Nail y Marco aparecen con texto plano + icono ⛓️💥 y overlay de carga
2. Espera a que los overlays terminen — Nail y Marco deberían obtener `resolvedUrl` y mostrar enlace + icono 🔀
3. Haz click en la cabecera de la columna "Producto" (o cualquier columna con ▲▼) para ordenar
4. Resultado esperado: la tabla se ordena correctamente, los nombres de Nail y Marco siguen siendo legibles y sus enlaces siguen funcionando. No debe aparecer ningún error en consola ni fila vacía.

---

## Prueba 10 — Orphans con resolvedUrl

Verifica que un producto con `resolvedUrl` que desaparece de la tabla aparece correctamente en "Reservas no encontradas".

**Paso 1 — Pegar en consola** (añade un producto ficticio con `resolvedUrl` que no existe en la tabla):
```js
chrome.storage.local.get("pixelatoyTexts", res => {
  const data = res.pixelatoyTexts || {};
  data["Producto Fantasma Con URL Resuelta - Elija forma de pago : Depósito"] = {
    "availableFrom": null, "availableFromDate": null,
    "brokenLink": false, "comingSoon": null, "date": "2026-08-01 00:00",
    "img": "https://www.pixelatoy.com/419336-home_default/krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/67441-nail-sh-figuarts-dragon-ball-z-4573102687463.html"
  };
  chrome.storage.local.set({ pixelatoyTexts: data });
});
```

**Qué debes ver tras recargar:**
- Aparece la sección "Reservas no encontradas" debajo de la tabla
- El producto fantasma aparece en esa sección con su miniatura
- El nombre es un enlace que apunta a `resolvedUrl` (`67441-nail-...`), no a `productUrl`
- Se puede eliminar individualmente sin errores

**Paso 2 — Limpiar** tras la prueba:
```js
chrome.storage.local.get("pixelatoyTexts", res => {
  const data = res.pixelatoyTexts || {};
  delete data["Producto Fantasma Con URL Resuelta - Elija forma de pago : Depósito"];
  chrome.storage.local.set({ pixelatoyTexts: data });
});
```

---

## Prueba 11 — Editar fecha manualmente en fila con resolvedUrl

Verifica que editar la fecha de una fila que ya tiene `resolvedUrl` no rompe el enlace ni el icono 🔀.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Super Saiyan Son Goku -Fighter Rage-. SH Figuarts. Dragon Ball Z - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en agosto de 2026", "availableFromDate": "2026-08-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/410672-home_default/super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61425-51849-super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z-4573102692900.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/71264-super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z-4573102692900.html",
    "date": "2026-08-15 00:00"
  }
}})
```

**Qué debes ver tras recargar:**
1. Super Saiyan Son Goku en tab "En almacén" con enlace a `resolvedUrl` (`71264-...`) + icono 🔀
2. Haz click en la celda "En almacén" e introduce una fecha nueva: `2026-10-01`
3. Pulsa fuera de la celda para guardar
4. Resultado esperado:
   - La celda muestra el contador de tiempo restante actualizado
   - La fila se colorea según urgencia
   - El nombre **sigue siendo un enlace** apuntando a `resolvedUrl` (`71264-...`)
   - El icono 🔀 **sigue visible** junto al nombre
   - En storage: `date: "2026-10-01 00:00"`, `resolvedUrl` intacto, `brokenLink: false`

---

## Prueba 12 — Refresh sin cambios con resolvedUrl ya guardado

Verifica que pulsar "Refrescar datos" en un producto con `resolvedUrl` y datos sin cambios no produce ningún overlay ni cambio visual.

**Pegar en consola:**
```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/67441-nail-sh-figuarts-dragon-ball-z-4573102687463.html"
  }
}})
```

**Qué debes ver tras recargar y pulsar "Refrescar datos":**
- Overlay de carga breve sobre la fila de Nail mientras se consulta
- Al terminar: **ningún overlay de cambios**, ningún toast de aviso
- El enlace sigue apuntando a `resolvedUrl` y el icono 🔀 sigue visible
- En storage: sin cambios respecto al estado inicial

---

## Anexo — Restaurar estado original

```js
chrome.storage.local.set({ pixelatoyTexts: {
  "Glorio. SH Figuarts. Dragon Ball Daima - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en abril de 2026", "availableFromDate": "2026-04-01 00:00",
    "brokenLink": false, "comingSoon": null, "date": "2026-05-20 00:00",
    "img": "https://www.pixelatoy.com/389090-home_default/glorio-sh-figuarts-dragon-ball-daima.jpg",
    "productUrl": "https://www.pixelatoy.com/es/reservas/58841-51376-glorio-sh-figuarts-dragon-ball-daima-4573102686527.html#/pago-deposito"
  },
  "Krillin -Earth's Strongest Man-. SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-07-23 00:00", "img": "https://www.pixelatoy.com/419336-home_default/krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62394-53719-krillin-earth-s-strongest-man-sh-figuarts-dragon-ball-z-4573102698711.html#/pago-deposito"
  },
  "Lord Starkiller. The Black Series. Star Wars. Hasbro - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-07-03 00:00", "img": "https://www.pixelatoy.com/444052-home_default/lord-starkiller-the-black-series-star-wars-hasbro.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/65213-58377-lord-starkiller-the-black-series-star-wars-hasbro-5010996367181.html#/pago-deposito"
  },
  "Magnagarurumon. Figure Rise Amplified. Digimon. Bandai Hobby (Model Kit) - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en noviembre 2026", "availableFromDate": "2026-11-01 00:00",
    "img": "https://www.pixelatoy.com/451873-home_default/plantilla-figure-rise-amplified-digimon.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/66126-59727-plantilla-figure-rise-amplified-digimon-4573102725592.html#/pago-deposito"
  },
  "Marco Marineford. SH Figuarts. One Piece - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "img": "https://www.pixelatoy.com/409092-home_default/marco-marineford-sh-figuarts-one-piece.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61221-51365-marco-marineford-sh-figuarts-one-piece-4573102692993.html#/pago-deposito"
  },
  "Nail. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre  de 2026", "availableFromDate": "2026-09-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/427533-home_default/nail-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/63423-55353-nail-sh-figuarts-dragon-ball-z-4573102687463.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/67441-nail-sh-figuarts-dragon-ball-z-4573102687463.html"
  },
  "Option Part Set Monkey.D.Luffy -Marineford-. SH Figuarts. One Piece. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en octubre de 2026", "availableFromDate": "2026-10-01 00:00",
    "img": "https://www.pixelatoy.com/468310-home_default/option-part-set-monkeydluffy-marineford-sh-figuarts-one-piece-bandai-tamashii-nations.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/67960-62913-option-part-set-monkeydluffy-marineford-sh-figuarts-one-piece-bandai-tamashii-nations-4573102721822.html#/pago-deposito"
  },
  "Piccolo (The Proud Namekian). SH Figuarts. Dragon Ball Z. - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en julio de 2026", "availableFromDate": "2026-07-01 00:00",
    "brokenLink": false, "comingSoon": null, "date": "2026-07-31 00:00",
    "img": "https://www.pixelatoy.com/419320-home_default/piccolo-the-proud-namekian-dragon-ball-z-sh-figuarts.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62392-53714-piccolo-the-proud-namekian-dragon-ball-z-sh-figuarts-4573102698704.html#/pago-deposito"
  },
  "Portgas.d.Ace -Marineford-. SH Figuarts. One Piece. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en noviembre 2026", "availableFromDate": "2026-11-01 00:00",
    "img": "https://www.pixelatoy.com/475085-home_default/portgasdace-marineford-sh-figuarts-one-piece-bandai-tamashii-nations.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/68652-64231-portgasdace-marineford-sh-figuarts-one-piece-bandai-tamashii-nations-4573102721266.html#/pago-deposito"
  },
  "Sir Crocodile -Marineford-. SH Figuarts. One Piece. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en septiembre de 2026", "availableFromDate": "2026-09-01 00:00",
    "img": "https://www.pixelatoy.com/470397-home_default/sir-crocodile-marineford-sh-figuarts-one-piece-bandai-tamashii-nations.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/68194-63380-sir-crocodile-marineford-sh-figuarts-one-piece-bandai-tamashii-nations-4573102721259.html#/pago-deposito"
  },
  "Super Saiyan Goku -Legendary Super Saiyan-. SH Figuarts. Dragon Ball Z. Bandai Tamashii Nations - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-05-25 00:00", "img": "https://www.pixelatoy.com/428136-home_default/super-saiyan-goku-legendary-super-saiyan-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/reservas/63490-55505-super-saiyan-goku-legendary-super-saiyan-sh-figuarts-dragon-ball-z-4573102650436.html#/pago-deposito"
  },
  "Super Saiyan Son Goku -Fighter Rage-. SH Figuarts. Dragon Ball Z - Elija forma de pago : Depósito": {
    "availableFrom": "Disponibilidad estimada en agosto de 2026", "availableFromDate": "2026-08-01 00:00",
    "brokenLink": false, "img": "https://www.pixelatoy.com/410672-home_default/super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/61425-51849-super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z-4573102692900.html#/pago-deposito",
    "resolvedUrl": "https://www.pixelatoy.com/es/preventas/71264-super-saiyan-son-goku-fighter-rage-sh-figuarts-dragon-ball-z-4573102692900.html"
  },
  "Trunks -Boy from the Future-. SH Figuarts. Dragon Ball Z - Elija forma de pago : Depósito": {
    "availableFrom": null, "availableFromDate": null, "brokenLink": false, "comingSoon": null,
    "date": "2026-06-30 00:00", "img": "https://www.pixelatoy.com/419296-home_default/trunks-boy-from-the-future-dragon-ball-z-sh-figuarts.jpg",
    "productUrl": "https://www.pixelatoy.com/es/preventas/62390-53707-trunks-boy-from-the-future-dragon-ball-z-sh-figuarts-4573102698698.html#/pago-deposito"
  }
}})
```
