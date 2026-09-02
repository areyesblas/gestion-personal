# Migraciones de base de datos

Cada archivo aquí representa un cambio de estructura (columnas, tablas) aplicado directamente
a la base de datos de Supabase. Se numeran en el orden en que se aplicaron.

Si algún día necesitas reconstruir la estructura de la base de datos desde cero, corre estos
archivos en orden numérico en el SQL Editor de Supabase (después de haber creado las 16 tablas
originales — ver el SDD para su esquema completo).

Cada vez que se aplique un cambio nuevo a la base de datos, se agrega un archivo nuevo aquí,
numerado consecutivamente, y se sube a GitHub en el mismo commit que el código que lo usa.
