- Cuando se añadan o modifiquen funcionalidades, actualizar el README.md para reflejar los cambios.
- Cuando se añadan o modifiquen funcionalidades, valorar si es necesario actualizar el IMPROVEMENTS.md y el CHANGELOG.md.
- Los mensajes de commit deben ser concisos, sin cuerpo descriptivo. Deben describir el cambio funcional, no la implementación técnica.
- El idioma del código (variables, funciones, comentarios) es en español cuando sea texto visible al usuario, e inglés para el código interno.
- Antes de implementar cambios, confirmar el enfoque con el usuario.

## Versionado y CHANGELOG

Usar **Semantic Versioning**: `MAJOR.MINOR.PATCH`

- `PATCH` → bugfixes, correcciones menores
- `MINOR` → nuevas funcionalidades
- `MAJOR` → cambios que rompen compatibilidad con el storage

La versión se mantiene en `manifest.json` (campo `version`).

## Flujo de trabajo con Git, issues y PRs

### Ramas

- `main` → producción, solo recibe merges desde `release/`
- `develop` → integración, solo recibe merges desde ramas de feature/fix
- Ramas de trabajo con prefijos: `feat/`, `fix/`, `refactor/`
- Siempre se crean desde `develop`

### Issues

- Cada mejora de `IMPROVEMENTS.md` tendrá su issue en GitHub
- Se crea el issue cuando se va a abordar la mejora, no antes
- Labels: `bug`, `enhancement`, `ui`, `refactor`, `blocked`

### Flujo completo

1. Crear issue en GitHub con el label correspondiente
2. Crear rama desde `develop` con el prefijo adecuado
3. Desarrollar la mejora en la rama
4. Cuando el desarrollo esté terminado y validado:
   - Actualizar documentación relevante (`README.md`, `IMPROVEMENTS.md`)
   - Amazon Q crea el PR con `Closes #XX` apuntando a `develop`
5. Mergear con **squash and merge**
6. El issue se cierra automáticamente al mergear

### Merge de develop a main

1. Crear rama `release/vX.Y.Z` desde `develop`
2. Actualizar `CHANGELOG.md` y `version` en `manifest.json` en esa rama
3. Amazon Q crea PR de `release/vX.Y.Z` → `main` con `Closes #XX` para todos los issues del release
4. El usuario revisa y mergea
5. Amazon Q crea PR de `release/vX.Y.Z` → `develop`
6. El usuario revisa y mergea
7. El tag se crea automáticamente vía GitHub Action
