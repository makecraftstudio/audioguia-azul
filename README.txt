═══════════════════════════════════════════════════════════════
 AUDIOGUÍA — TEATRO ESPAÑOL DE AZUL
 Instalación y mantenimiento
═══════════════════════════════════════════════════════════════

Desarrollo: Bamboo Studio — somosbamboo.com


───────────────────────────────────────────────────────────────
1. INSTALACIÓN
───────────────────────────────────────────────────────────────

Subir el contenido de esta carpeta al servidor, dentro de una
carpeta llamada "audioguia" en la raíz del sitio, de modo que
quede accesible en:

    https://teatroespanoldeazul.com/audioguia/

No hace falta instalar nada, ni base de datos, ni plugins.
Son archivos estáticos: se copian y funcionan.

IMPORTANTE: la audioguía NO funciona haciendo doble clic en
index.html desde la computadora. Tiene que estar servida por el
servidor web y abrirse por su URL. Si se abre mal, la propia
aplicación muestra un cartel explicándolo.


───────────────────────────────────────────────────────────────
2. QUÉ HAY EN ESTA CARPETA
───────────────────────────────────────────────────────────────

  index.html      Estructura de la página. Rara vez se toca.
  styles.css      Todo el diseño (colores, tipografías, etc).
  app.js          La lógica: player, navegación, idiomas.
  content.json    ← EL CONTENIDO. Es el único archivo que hay
                    que tocar para corregir textos.
  README.txt      Este archivo.

  images/         Fotos de cada parada + splash.webp
  audios/         Los mp3, una carpeta por parada

Las carpetas images/ y audios/ tienen que estar al mismo nivel
que index.html. Si falta una foto o un audio, la aplicación no
se rompe: muestra la imagen de portada en lugar de la foto, y
deja el reproductor deshabilitado en lugar de colgarse.


───────────────────────────────────────────────────────────────
3. CÓMO CORREGIR UN TEXTO
───────────────────────────────────────────────────────────────

Abrir content.json con un editor de texto plano (Notepad++,
VS Code, TextEdit en modo texto). NO usar Word.

Guardar siempre en codificación UTF-8, o los acentos y las eñes
se rompen.

Cada parada tiene esta forma:

  {
    "id": "a01",
    "title":    { "es": "...", "en": "..." },
    "duration": "2:30",
    "audioUrl": { "es": "audios/01/...mp3", "en": "..." },
    "text":     { "es": "...", "en": "..." },
    "images":   [ "images/01/01.jpg", "images/01/02.jpg" ]
  }

  title     Título corto que se ve en pantalla y en el índice.
  duration  Duración que se muestra en el índice. Es solo un
            texto informativo; el reproductor usa la duración
            real del mp3.
  text      Descripción completa (el botón "Leer descripción").
            Para separar párrafos se usa \n\n dentro de las
            comillas.
  images    Las fotos del carrusel, en orden, con su epígrafe.
            Ver el punto 3b.

Tres cuidados al editar:
  · No borrar las comillas ni los dos puntos.
  · No dejar una coma suelta antes de un ] o un }
  · Después de guardar, pegar el archivo en jsonlint.com para
    verificar que no quedó ningún error de sintaxis.

Si el JSON queda mal escrito, la aplicación muestra un cartel de
error en vez de cargar. No se pierde nada: se corrige el archivo
y vuelve a andar.


───────────────────────────────────────────────────────────────
3b. EPÍGRAFES DE LAS FOTOS
───────────────────────────────────────────────────────────────

Cada foto puede llevar su epígrafe. Se escribe en content.json,
dentro de la lista "images" de cada parada, una foto por línea:

  "images": [
    { "src": "images/01/01.jpg", "caption": { "es": "", "en": "" } },
    { "src": "images/01/02.jpg", "caption": { "es": "", "en": "" } }
  ]

Se completa el texto entre las comillas de "es" y "en":

    { "src": "images/01/01.jpg",
      "caption": { "es": "La fachada en 1897, todavía sin terminar.",
                   "en": "The facade in 1897, still unfinished." } },

Los epígrafes son opcionales. Si quedan vacíos, la foto se
muestra limpia, sin ninguna banda de texto encima. Se pueden ir
completando de a poco: las que faltan simplemente no muestran
nada.

Recomendación de extensión: sobre la foto se ven hasta dos
líneas (unos 90 caracteres). Si el texto es más largo, se corta
con puntos suspensivos ahí, pero se lee completo cuando el
visitante amplía la foto. O sea: conviene que lo importante
esté en las primeras dos líneas.


───────────────────────────────────────────────────────────────
3c. VISOR A PANTALLA COMPLETA
───────────────────────────────────────────────────────────────

Tocando una foto —o el botón de las flechitas arriba a la
derecha— la galería se abre a pantalla completa. Ahí el
visitante puede:

  · pasar fotos deslizando el dedo, con las flechas o los
    puntitos de abajo
  · leer el epígrafe completo, sin recorte
  · hacer zoom con dos dedos
  · cerrar con la X, deslizando hacia abajo, o con Escape

El audio sigue reproduciéndose mientras mira las fotos.
Al cerrar, el carrusel queda en la última foto que estaba viendo.


───────────────────────────────────────────────────────────────
4. IDIOMAS
───────────────────────────────────────────────────────────────

Esta versión sale con español e inglés. Los idiomas activos se
definen arriba de content.json:

  "langs": [
    { "code": "es", "flag": "🇦🇷", "label": "Español" },
    { "code": "en", "flag": "🇬🇧", "label": "English" }
  ]

Los textos en portugués y francés ya están traducidos y quedaron
guardados en el archivo, pero los idiomas están desactivados
porque todavía no existen los audios. Para activarlos, agregar
la línea correspondiente en "langs" y subir los mp3:

    { "code": "pt", "flag": "🇧🇷", "label": "Português" },
    { "code": "fr", "flag": "🇫🇷", "label": "Français" }

El visitante elige idioma la primera vez y queda guardado en su
teléfono. Puede cambiarlo con el botón "ES / EN" arriba a la
derecha.


───────────────────────────────────────────────────────────────
5. LOS CÓDIGOS QR
───────────────────────────────────────────────────────────────

Cada parada tiene su dirección directa. La numeración va del
01 al 14 y sigue el orden del recorrido:

    https://teatroespanoldeazul.com/audioguia/#01
    https://teatroespanoldeazul.com/audioguia/#02
    ...
    https://teatroespanoldeazul.com/audioguia/#14

También funciona con ?id=01 en lugar de #01, y con el id interno
(#a01), por si alguna vez hace falta.

⚠ Si los QR impresos apuntan a la raíz del dominio
  (teatroespanoldeazul.com/#01, sin /audioguia/), hay que agregar
  este bloque en el <head> del sitio principal para que redirija:

    <script>
    (function () {
      var h = location.hash;
      if (/^#\d{1,3}$/.test(h) && location.pathname === "/") {
        location.replace("/audioguia/" + h);
      }
    })();
    </script>

  Esto tiene que ir en el sitio del teatro, no en la audioguía.


───────────────────────────────────────────────────────────────
6. REQUISITOS DEL SERVIDOR
───────────────────────────────────────────────────────────────

· HTTPS (para que el navegador permita reproducir audio sin
  advertencias).
· Soporte de "Range requests" para poder adelantar y retroceder
  dentro de un audio. Apache y nginx lo traen activado de
  fábrica; no hay que hacer nada especial.
· Que el servidor entregue .mp3 y .webp con su tipo MIME
  correcto (también es lo normal).

La audioguía no usa cookies, no guarda datos personales y no
depende de ningún servicio externo, salvo las tipografías, que
se cargan desde Google Fonts. Si el servidor no tiene salida a
internet o el visitante no tiene señal, la aplicación funciona
igual: cambia la tipografía por una del sistema.


───────────────────────────────────────────────────────────────
7. DETALLES MENORES
───────────────────────────────────────────────────────────────

· index.html busca un ícono en images/favicon.png (cuadrado,
  512x512). Es el que se ve si el visitante agrega la audioguía
  a la pantalla de inicio del teléfono. Si no existe, no pasa
  nada: solo no se ve ícono.
· Las etiquetas para compartir por WhatsApp están al principio
  de index.html. Si alguna vez cambia el dominio, hay dos URLs
  ahí que hay que actualizar.
· El audio arranca solo al abrir una parada. Algunos navegadores
  lo bloquean; en ese caso queda en pausa y el visitante toca
  play. Es el comportamiento esperado.

Ante cualquier duda o para actualizaciones de contenido,
escribir a Bamboo Studio.
