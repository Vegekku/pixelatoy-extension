# Changelog

Todos los cambios notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versionado según [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

## [1.3.0] - 2026-06-10

### Fixed

- Restaurar toggles colapsables en leyenda y sección "Reservas no encontradas"
- Priorizar "Entrada en almacén" sobre "Disponibilidad" cuando ambos campos están presentes
- Emoji ⛓️💥 en leyenda con ZWJ para consistencia visual con los links

### Changed

- Unificar forma de retorno de `fetchDateFromProduct` con todos los campos siempre presentes
- Unificar condición de skip en `autoFetchMissingData`
- Limpiar intervalo de animación al eliminar overlay de carga
- Descripción del manifest ajustada a 131 caracteres

### Added

- Política de privacidad (`privacy.html`) para la Chrome Web Store
- Carpeta `dist/` para ZIPs de la extensión (ignorada por git)

## [1.2.1] - 2026-06-10

### Changed

- Excluidos `.amazonq/` e `icons/image.png` del repositorio

## [1.2.0] - 2026-05-30

### Added

- Fecha estimada de disponibilidad en columna "En almacén" para productos no disponibles (gris cursiva)
- Fecha estimada usada como criterio de ordenación
- Detección automática del cambio de disponibilidad estimada a fecha real al refrescar

## [1.1.0] - 2026-05-30

### Added

- Sección "Reservas no encontradas" enriquecida con miniatura y enlace al producto
- Sección "Reservas no encontradas" colapsable, cargada colapsada por defecto
- Instrucciones de uso colapsables, cargadas colapsadas por defecto
- Iconos personalizados (16x16, 48x48, 128x128)

### Changed

- Sección "Datos huérfanos" renombrada a "Reservas no encontradas"
- Instrucciones de uso reestructuradas priorizando funcionalidades automáticas

## [1.0.0] - 2025-01-01

### Added

- Columna "En almacén" editable con múltiples formatos de fecha aceptados
- Contador dinámico de tiempo restante hasta el límite (fecha + 3 meses), actualizado cada minuto
- Coloreado de filas por urgencia: negro (<7d), rojo (<30d), naranja (<60d), verde (≥60d)
- Ordenación por columnas con ciclo ascendente/descendente/original
- Leyenda visual con colores y instrucciones de uso
- Popup del icono con resumen de productos agrupados por urgencia y toggles desplegables
- Sección de datos huérfanos con eliminación individual y global
- Obtención automática de URL del producto y fecha de almacén al cargar la página
- Overlay de carga por fila durante el auto-fetch
- Enlace al detalle del producto desde el nombre en la tabla
- Detección de enlaces rotos con icono ⛓️💥
- Botón "Refrescar datos" con overlay informativo de cambios y aceptar/rechazar por fila

[Unreleased]: https://github.com/Vegekku/pixelatoy-extension/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Vegekku/pixelatoy-extension/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/Vegekku/pixelatoy-extension/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Vegekku/pixelatoy-extension/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Vegekku/pixelatoy-extension/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Vegekku/pixelatoy-extension/releases/tag/v1.0.0
