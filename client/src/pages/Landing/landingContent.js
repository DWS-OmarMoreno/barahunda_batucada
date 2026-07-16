/**
 * landingContent.js — Contenido centralizado del sitio web informativo.
 * Modifica este archivo para actualizar textos, imágenes, redes sociales y
 * datos de contacto sin necesidad de tocar los componentes React.
 *
 * Imágenes: colocar los archivos en client/public/landing/
 * Ejemplo: '/landing/hero.jpg' corresponde a client/public/landing/hero.jpg
 */

export const CONTENT = {

  /* ── Datos generales de la escuela ─────────────────────────────────────── */
  escuela: {
    nombre:    'Barahúnda Batucada',
    slogan:    'Percusión y Arte Comunitario en Bogotá',
    logo:      'https://barahundabatucada.com.co/uploads/logos/1782927290642-403579325.PNG',
    ciudad:    'Bogotá, Colombia',

    // Número sin espacios ni guiones, con código de país. Ej: 573101234567
    whatsapp:  '+573132903745',
    email:     'info@barahundabatucada.com.co',

    redes: {
      instagram: 'https://www.instagram.com/barahundabatucada/',
      facebook:  'https://www.facebook.com/BarahundaBatucadaOficial/',
      youtube:   null, // null = oculto
      tiktok:    "https://www.tiktok.com/@barahunda.batucada?_t=8jAYVbu4GgQ&_r=1&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnVRQAzXB3BmnEyTK03TlxHRwr-gxPoMPmd07gd1sFWvEp2Uv4PmcUXS2wlzg_aem_xO2qq8q2LilaIa5y6b2zRg",
    },
  },

  /* ── Página: Inicio ─────────────────────────────────────────────────────── */
  inicio: {
    hero: {
      // Imagen de fondo del hero (pantalla completa). Agregar archivo en public/landing/
      imagen:    '/landing/hero1.png',
      titulo:    ['Donde el ritmo', 'es batalla'],
      subtitulo: 'Batucada, percusión y arte comunitario\nen las calles de Bogotá',
      cta:       'Contáctenos',
    },

    servicios: [
      {
        icono:  '🥁',
        titulo: 'Shows en Vivo',
        desc:   'Comparsas y batucadas itinerantes para eventos, carnavales y celebraciones. Energía pura que arrastra multitudes.',
      },
      {
        icono:  '🎓',
        titulo: 'Talleres de Percusión',
        desc:   'Clases de samba reggae, batucada y percusión afrobrasileña para todos los niveles. Desde principiantes hasta avanzados.',
      },
      {
        icono:  '🎪',
        titulo: 'Activaciones de Marca',
        desc:   'Ritmo y espectáculo para lanzamientos de producto, ferias, eventos corporativos y activaciones de marca.',
      },
      {
        icono:  '🌀',
        titulo: 'Arte Comunitario',
        desc:   'Formación musical y cultural para comunidades del sur de Bogotá. El ritmo como herramienta de transformación social.',
      },
    ],

    stats: [
      { valor: '10+',  etiqueta: 'Años de experiencia' },
      { valor: '200+', etiqueta: 'Eventos realizados'  },
      { valor: '30+',  etiqueta: 'Percusionistas'      },
    ],

    sobrePreview: {
      imagen:  '/landing/imagen2.png', // agregar imagen
      titulo:  'El espíritu guerrero\ndel ritmo',
      texto:   'Nacimos en las calles de Usme con una misión: darle voz a quienes no la tienen a través de la percusión. Barahúnda no es solo una batucada — es un grito colectivo, una fuerza comunitaria, una batalla que se gana con el tambor.',
      cta:     'Conoce nuestra historia',
    },

    galeriaPreview: [
      '/landing/galeria/preview1.jpg',
      '/landing/galeria/preview2.jpg',
      '/landing/galeria/preview3.jpg',
      '/landing/galeria/preview4.jpg',
    ],
  },

  /* ── Página: Sobre Nosotros ─────────────────────────────────────────────── */
  nosotros: {
    hero: {
      imagen:    '/landing/iamgen3.png',
      titulo:    'Somos Barahúnda',
      subtitulo: 'Una batucada nacida en Usme, forjada en la calle',
    },

    historia: {
      imagen: '/landing/imagen4.png',
      titulo: 'Nuestra historia',
      parrafos: [
        'Barahúnda Batucada nació en la localidad de Usme, al sur de Bogotá, con la convicción de que el ritmo puede transformar comunidades. Inspirados en el espíritu guerrero — como Leónidas defendiendo las Termópilas — decidimos que nuestra batalla sería contra el silencio y la exclusión, y nuestras armas serían los tambores.',
        'A lo largo de los años hemos llenado calles, plazas y escenarios con la energía inigualable de la batucada y el samba reggae, llevando nuestro arte a eventos, festivales y activaciones de marca en toda Bogotá y Colombia. Somos percusionistas, artistas y activistas del ritmo.',
      ],
    },

    mision: [
      {
        romano: 'I',
        titulo: 'Misión',
        texto:  'Crear espacios de encuentro comunitario a través de la percusión, el arte y la cultura afrobrasileña, dando voz y visibilidad a las comunidades del sur de Bogotá.',
      },
      {
        romano: 'II',
        titulo: 'Visión',
        texto:  'Ser la batucada referente de Colombia, reconocida por su excelencia artística, su compromiso social y su capacidad de llevar energía y ritmo a cualquier escenario.',
      },
      {
        romano: 'III',
        titulo: 'Valores',
        texto:  'Comunidad, resistencia, alegría, disciplina y la convicción de que el ritmo colectivo es una fuerza que transforma.',
      },
    ],

    // Agregar miembros del equipo con foto y rol
    equipo: [
      { nombre: 'Randy', rol: 'Director artístico',   foto: '/landing/randy.png' },
      { nombre: 'Nombre del miembro', rol: 'Percusionista líder',  foto: '/landing/equipo/miembro2.jpg' },
      { nombre: 'Nombre del miembro', rol: 'Instructora de samba', foto: '/landing/equipo/miembro3.jpg' },
      { nombre: 'Nombre del miembro', rol: 'Gestión cultural',     foto: '/landing/equipo/miembro4.jpg' },
    ],

    // Niveles de formación (aparecen después de "Los Guerreros")
    niveles: [
      {
        romano:    'I',
        nombre:    'Hoplitas',
        etiqueta:  'Nivel Iniciación',
        imagen:    '/landing/hoplitas.png', // agregar imagen
        descripcion: 'Los Hoplitas son el punto de entrada a Barahúnda. Aquí comienza la transformación: de ciudadano a guerrero del ritmo. En este nivel aprendemos la base de la batucada, la disciplina del grupo y el lenguaje percusivo que nos une como colectivo.',
        detalles: [
          'Introducción a los instrumentos de percusión: surdo, caixa, repique y agogô',
          'Fundamentos del ritmo en batucada: pulso, tiempo y sincronía grupal',
          'Técnica básica de golpe y postura corporal',
          'Primeras coreografías de conjunto',
          'Duración estimada: 3 a 6 meses',
        ],
      },
      {
        romano:    'II',
        nombre:    'Hippeis',
        etiqueta:  'Nivel Intermedio',
        imagen:    '/landing/hippeis.png', // agregar imagen
        descripcion: 'Los Hippeis ya conocen el campo de batalla. En este nivel profundizamos en el samba reggae, exploración de nuevos ritmos y la autonomía del percusionista. El Hippeis puede liderar una voz dentro del grupo y comenzar a comprender la arquitectura musical de la batucada.',
        detalles: [
          'Samba reggae: ritmos afrobrasileños y su historia',
          'Dominio de múltiples instrumentos de la batucada',
          'Lectura de partituras rítmicas y señas del director',
          'Improvisación y fills dentro del contexto grupal',
          'Participación en eventos y presentaciones públicas',
          'Duración estimada: 6 a 12 meses',
        ],
      },
      {
        romano:    'III',
        nombre:    'Espartanos',
        etiqueta:  'Nivel Avanzado',
        imagen:    '/landing/espartanos.png', // agregar imagen
        descripcion: 'Los Espartanos son la élite de Barahúnda. Guerreros completos que dominan el ritmo, el espacio y la energía colectiva. En este nivel el percusionista asume roles de liderazgo, transmisión del conocimiento y creación de nuevos materiales para el grupo.',
        detalles: [
          'Dominio técnico completo de todos los instrumentos',
          'Dirección y conducción de ensayos y secciones del grupo',
          'Composición y arreglo de piezas para batucada',
          'Formación como instructor para nuevos Hoplitas',
          'Participación en festivales y eventos de alto perfil',
          'Proyectos especiales: comparsa, LED show, fusión musical',
        ],
      },
      {
        romano:    'IV',
        nombre:    'Artemisas',
        etiqueta:  'Nivel Avanzado',
        imagen:    '/landing/artemisas.png', // agregar imagen
        descripcion: 'Los Artemisas son la élite de Barahúnda. Guerreras completas que dominan el ritmo, el espacio y la energía colectiva. En este nivel el percusionista asume roles de liderazgo, transmisión del conocimiento y creación de nuevos materiales para el grupo.',
        detalles: [
          'Dominio técnico completo de todos los instrumentos',
          'Dirección y conducción de ensayos y secciones del grupo',
          'Composición y arreglo de piezas para batucada',
          'Formación como instructor para nuevos Hoplitas',
          'Participación en festivales y eventos de alto perfil',
          'Proyectos especiales: comparsa, LED show, fusión musical',
        ],
      }
    ],

    timeline: [
      { año: '2010', hito: 'Fundación de Barahúnda Batucada en la localidad de Usme, Bogotá' },
      { año: '2013', hito: 'Primera participación en festival de batucadas de la ciudad' },
      { año: '2016', hito: 'Expansión a eventos corporativos y activaciones de marca' },
      { año: '2019', hito: 'Encuentro Juvenil de Batucadas — Plaza Central de Usme' },
      { año: '2023', hito: 'Más de 200 eventos realizados y 30 percusionistas activos' },
    ],
  },

  /* ── Página: Galería ────────────────────────────────────────────────────── */
  galeria: {
    categorias: ['Todos', 'Shows', 'Talleres', 'Eventos', 'Comparsas'],

    // Agregar imágenes aquí:
    // { src: '/landing/galeria/foto.jpg', categoria: 'Shows', alt: 'Descripción breve' }
    imagenes: [],

    // Agregar videos de YouTube aquí:
    // { embedUrl: 'https://www.youtube.com/embed/VIDEO_ID', titulo: 'Título del video' }
    videos: [],
  },

  /* ── Página: Contáctenos ────────────────────────────────────────────────── */
  contactenos: {
    hero: {
      titulo:    '¿Listo para la batalla?',
      subtitulo: 'Cuéntanos sobre tu evento y hagamos algo épico juntos',
    },

    tiposEvento: [
      'Show en vivo / Comparsa',
      'Taller de percusión',
      'Activación de marca',
      'Evento corporativo',
      'Festival / Carnaval',
      'Otro',
    ],

    // Mensaje de WhatsApp predefinido (se abre al hacer click en el enlace de WhatsApp)
    whatsappMensaje: 'Me gustaría conocer más de Barahúnda Batucada 🥁',

    // URL embed de Google Maps (reemplazar con la ubicación exacta)
    mapaEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.8149698672637!2d-74.11648699999999!3d4.627077!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f99de58370547%3A0x69c58250c2ecace6!2sCasa%20Olimpo%20-%20Barah%C3%BAnda%20batucada!5e0!3m2!1ses-419!2sco!4v1784181989479!5m2!1ses-419!2sco',
  },
};
