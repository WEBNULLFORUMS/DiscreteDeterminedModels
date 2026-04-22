// ===== App State =====
const state = {
  currentPage: 'landing',
  currentModel: null,
  sessionStart: null,
  moves: 0,
  progress: 0,
  solvedTasks: 0,
  matrixDifficulty: 'medium',
  ringsDifficulty: 'medium',
  graphDifficulty: 'medium',
  matrixSave: null,
  shouldRestoreMatrix: false,
  progressHistory: [],
  moveHistory: [],
  isGameWon: false,
  totalTaskTime: 0,
  solvedModels: {
    matrix: { maxDifficulty: null, stars: 0 },
    rings: { maxDifficulty: null, stars: 0 },
    graph: { maxDifficulty: null, stars: 0 }
  },
  modelHistory: {
    matrix: [],
    rings: [],
    graph: []
  },
  sessionData: {
    totalTime: 0,
    accuracy: 0,
    speed: 0,
    logic: 0,
    algorithmic: 0
  },
  helpShown: {
    matrix: false,
    rings: false,
    graph: false
  }
};

// ===== Global Initialization Flags =====
let sidebarInitialized = false;
let sidebarMouseMoveHandler = null;
let sidebarMouseUpHandler = null;
let graphResizeTimeout = null;
let lastGraphWindowSize = { width: window.innerWidth, height: window.innerHeight };
let cachedResponsiveBucket = '';
let cachedResponsiveConfig = null;

// ===== Graph Responsive Config =====
// Single source of truth for graph breakpoints/sizes (syncs with CSS custom properties).
const RESPONSIVE_CONFIG = {
  breakpoints: {
    xs: 320,
    sm: 480,
    md: 640,
    lg: 768,
    xl: 1024,
    xxl: 1200
  },
  graph: {
    xs: { nodeSize: 38, padding: 10, multiplier: 0.6, minHeight: 320 },
    sm: { nodeSize: 44, padding: 15, multiplier: 0.7, minHeight: 360 },
    md: { nodeSize: 48, padding: 15, multiplier: 0.8, minHeight: 390 },
    lg: { nodeSize: 54, padding: 20, multiplier: 0.85, minHeight: 410 },
    xl: { nodeSize: 58, padding: 25, multiplier: 0.9, minHeight: 430 },
    xxl: { nodeSize: 62, padding: 30, multiplier: 1, minHeight: 460 }
  }
};

function syncResponsiveConfigWithCSS() {
  const cssVars = getComputedStyle(document.documentElement);
  const parsePx = (name, fallback) => {
    const value = parseFloat(cssVars.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };

  RESPONSIVE_CONFIG.breakpoints.xs = parsePx('--bp-xs', RESPONSIVE_CONFIG.breakpoints.xs);
  RESPONSIVE_CONFIG.breakpoints.sm = parsePx('--bp-sm', RESPONSIVE_CONFIG.breakpoints.sm);
  RESPONSIVE_CONFIG.breakpoints.md = parsePx('--bp-md', RESPONSIVE_CONFIG.breakpoints.md);
  RESPONSIVE_CONFIG.breakpoints.lg = parsePx('--bp-lg', RESPONSIVE_CONFIG.breakpoints.lg);
  RESPONSIVE_CONFIG.breakpoints.xl = parsePx('--bp-xl', RESPONSIVE_CONFIG.breakpoints.xl);
  RESPONSIVE_CONFIG.breakpoints.xxl = parsePx('--bp-2xl', RESPONSIVE_CONFIG.breakpoints.xxl);
}

function getResponsiveBucket(width) {
  const bp = RESPONSIVE_CONFIG.breakpoints;
  if (width >= bp.xxl) return 'xxl';
  if (width >= bp.xl) return 'xl';
  if (width >= bp.lg) return 'lg';
  if (width >= bp.md) return 'md';
  if (width >= bp.sm) return 'sm';
  return 'xs';
}

// Picks graph sizing profile for current viewport.
function getResponsiveConfig() {
  const bucket = getResponsiveBucket(window.innerWidth);
  if (cachedResponsiveConfig && cachedResponsiveBucket === bucket) {
    return cachedResponsiveConfig;
  }
  cachedResponsiveBucket = bucket;
  cachedResponsiveConfig = RESPONSIVE_CONFIG.graph[bucket];
  return cachedResponsiveConfig;
}

// Computes usable graph area with orientation-aware UI reservations.
function getEffectiveDimensions(containerWidth = 700, containerHeight = 450) {
  const config = getResponsiveConfig();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isPortrait = viewportHeight > viewportWidth;
  const isLandscape = viewportWidth > viewportHeight;
  const horizontalChrome = config.padding * 2 + 20;
  const verticalChrome = isLandscape ? 95 : 130;
  const width = Math.max(280, Math.min(containerWidth, viewportWidth - horizontalChrome));
  const viewportLimitedHeight = Math.max(260, viewportHeight - verticalChrome);
  const height = Math.max(config.minHeight, Math.min(containerHeight, viewportLimitedHeight));

  return {
    width,
    height,
    isPortrait,
    isLandscape,
    aspectRatio: viewportWidth / Math.max(viewportHeight, 1)
  };
}

function reloadGraphModel() {
  const canvas = document.getElementById('mainCanvas');
  if (!canvas || state.currentModel !== 'graph' || !canvas.graphData) return;
  initGraphGame(canvas, getDifficultyForModel('graph'));
}

function setupGraphResponsiveHandlers() {
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      reloadGraphModel();
      lastGraphWindowSize = { width: window.innerWidth, height: window.innerHeight };
    }, 200);
  });

  window.addEventListener('resize', () => {
    clearTimeout(graphResizeTimeout);
    graphResizeTimeout = setTimeout(() => {
      const widthDiff = Math.abs(window.innerWidth - lastGraphWindowSize.width);
      const heightDiff = Math.abs(window.innerHeight - lastGraphWindowSize.height);
      if (widthDiff > 50 || heightDiff > 50) {
        cachedResponsiveConfig = null;
        reloadGraphModel();
      }
      lastGraphWindowSize = { width: window.innerWidth, height: window.innerHeight };
    }, 300);
  });
}

// ===== DOM Elements =====
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const terminalOutput = document.getElementById('terminalOutput');
const toastContainer = document.getElementById('toastContainer');

// ===== Glossary Terms =====
const glossaryTerms = [
  {
    title: 'Императивная парадигма',
    definition: 'Парадигма программирования, которая описывает процесс вычисления в виде последовательности команд, изменяющих состояние программы.',
    relation: 'В нашем коде: Используется для управления состоянием игровых моделей через последовательные операции.',
    code: `<span class="keyword">function</span> <span class="function">updateState</span>(action) {
  <span class="comment">// Императивное изменение состояния</span>
  state.moves++;
  state.progress = <span class="function">calculateProgress</span>();
  <span class="function">render</span>();
}`
  },
  {
    title: 'XOR (Исключающее ИЛИ)',
    definition: 'Логическая операция, возвращающая истину, если ровно один из операндов истинен. Обозначается символом XOR или ^.',
    relation: 'В матричной модели: Каждое нажатие инвертирует ячейку и соседей через XOR.',
    code: `<span class="comment">// XOR инверсия ячейки</span>
cell.value = cell.value <span class="keyword">^</span> <span class="string">1</span>;
<span class="comment">// 0 -> 1, 1 -> 0</span>`
  },
  {
    title: 'Алгоритм Дейкстры',
    definition: 'Алгоритм поиска кратчайшего пути от одной вершины графа до всех остальных. Работает только с неотрицательными весами ребер.',
    relation: 'В графовой модели: Используется для нахождения оптимального маршрута с учетом ограничений.',
    code: `<span class="keyword">function</span> <span class="function">dijkstra</span>(graph, start) {
  <span class="keyword">const</span> dist = {};
  <span class="keyword">const</span> queue = <span class="keyword">new</span> <span class="function">PriorityQueue</span>();
  queue.<span class="function">enqueue</span>(start, <span class="string">0</span>);
  <span class="comment">// ... обход графа</span>
}`
  },
  {
    title: 'Энтропия системы',
    definition: 'Мера хаоса или неупорядоченности в системе. В контексте алгоритмов - количество "беспорядка", которое необходимо устранить.',
    relation: 'Отображается как метрика: Уменьшается при правильных решениях пользователя.',
    code: `<span class="keyword">function</span> <span class="function">calculateEntropy</span>(matrix) {
  <span class="keyword">let</span> disorder = <span class="string">0</span>;
  <span class="keyword">for</span> (<span class="keyword">let</span> cell <span class="keyword">of</span> matrix) {
    <span class="keyword">if</span> (cell !== target) disorder++;
  }
  <span class="keyword">return</span> disorder / matrix.length;
}`
  },
  {
    title: 'Циклическая группа',
    definition: 'Группа, порожденная одним элементом. Все элементы получаются последовательным применением операции к порождающему элементу.',
    relation: 'В модели колец: Вращение колец образует циклическую группу состояний.',
    code: `<span class="comment">// Циклическое вращение</span>
<span class="keyword">const</span> rotate = (angle, max) => 
  (angle % max + max) % max;
<span class="comment">// Всегда в диапазоне [0, max)</span>`
  },
  {
    title: 'Ориентированный граф',
    definition: 'Граф, в котором ребра имеют направление. Ребро (u, v) позволяет перейти только от u к v, но не наоборот.',
    relation: 'В Kaspi-модели: Транзакции имеют направление от отправителя к получателю.',
    code: `<span class="keyword">const</span> graph = {
  nodes: [<span class="string">'A'</span>, <span class="string">'B'</span>, <span class="string">'C'</span>],
  edges: [
    { from: <span class="string">'A'</span>, to: <span class="string">'B'</span>, weight: <span class="string">5</span> },
    { from: <span class="string">'B'</span>, to: <span class="string">'C'</span>, weight: <span class="string">3</span> }
  ]
};`
  },
  {
    title: 'Матрица смежности',
    definition: 'Способ представления графа в виде квадратной матрицы, где элемент a[i][j] указывает на наличие и вес ребра между вершинами i и j.',
    relation: 'Используется внутренне для расчета путей в графовой модели.',
    code: `<span class="comment">// Матрица смежности 3x3</span>
<span class="keyword">const</span> adj = [
  [<span class="string">0</span>, <span class="string">5</span>, <span class="string">0</span>],
  [<span class="string">0</span>, <span class="string">0</span>, <span class="string">3</span>],
  [<span class="string">0</span>, <span class="string">0</span>, <span class="string">0</span>]
];`
  },
  {
    title: 'Детерминизм',
    definition: 'Свойство системы, при котором одинаковые входные данные всегда приводят к одинаковому результату. Отсутствие случайности.',
    relation: 'Все модели детерминированы: Одни и те же действия дают предсказуемый результат.',
    code: `<span class="comment">// Детерминированная функция</span>
<span class="keyword">function</span> <span class="function">nextState</span>(current, action) {
  <span class="comment">// Результат зависит ТОЛЬКО от</span>
  <span class="comment">// current и action</span>
  <span class="keyword">return</span> transitions[current][action];
}`
  },
  {
    title: 'Декомпозиция',
    definition: 'Процесс разделения сложной системы или задачи на более мелкие, простые и управляемые части (подсистемы), которые легче анализировать и реализовывать.',
    relation: 'Позволяет справиться со сложностью: решение большой задачи сводится к последовательному решению набора малых задач.',
    code: `<span class="comment">// Декомпозиция сложной логики на чистые функции</span>
<span class="keyword">const</span> <span class="function">validate</span> = (data) => !!data.name;
<span class="keyword">const</span> <span class="function">save</span> = (data) => database.push(data);

<span class="keyword">function</span> <span class="function">processUser</span>(user) {
  <span class="keyword">if</span> (validate(user)) save(user); <span class="comment">// Составная задача разделена</span>
}`
  },
  {
    title: 'Формализация',
    definition: 'Переход от содержательного описания объекта или процесса на естественном языке к строгому описанию с помощью искусственного языка (математики, логики или кода).',
    relation: 'Устраняет двусмысленность: превращает абстрактную идею в четкий алгоритм, понятный машине.',
    code: `<span class="comment">// Естественный язык: "Если пользователь взрослый, пусти его"</span>
<span class="comment">// Формализованный вид (логическое выражение):</span>
<span class="keyword">const</span> <span class="variable">isAllowed</span> = user.age >= <span class="number">18</span>;`
  },
  {
    title: 'Изоморфное отображение',
    definition: 'Соответствие между двумя структурами, при котором сохраняются все связи и свойства. Если структуры изоморфны, операции в одной полностью соответствуют операциям в другой.',
    relation: 'В разработке: код, который может выполняться и на сервере, и на клиенте с сохранением идентичной логики и состояния.',
    code: `<span class="comment">// Одна и та же функция рендеринга (Isomorphic/Universal JS)</span>
<span class="keyword">function</span> <span class="function">renderApp</span>(state) {
  <span class="comment">// Работает в Node.js (SSR) и в браузере</span>
  <span class="keyword">return</span> <span class="string">\`&lt;div&gt;\${state.title}&lt;/div&gt;\`</span>;
}`
  },
  {
    title: 'Декларативная парадигма',
    definition: 'Стиль программирования, при котором описывается *что* программа должна достичь (желаемый результат), а не пошаговое руководство *как* это сделать.',
    relation: 'Снижает количество побочных эффектов и делает код более читаемым за счет абстрагирования от управления состоянием и циклами.',
    code: `<span class="comment">// Декларативный подход (SQL или Array methods)</span>
<span class="keyword">const</span> <span class="variable">activeUsers</span> = users.<span class="function">filter</span>(u => u.isActive);

<span class="comment">// Мы не пишем цикл 'for', мы описываем КРИТЕРИЙ выбора</span>`
  },
  {
    title: 'Антифрод-система',
    definition: 'Сервис для оценки транзакций или действий на предмет вероятности мошенничества (фрода) в режиме реального времени с использованием правил и ML-моделей.',
    relation: 'Защищает бизнес от потерь: анализирует паттерны поведения, геолокацию и отпечатки устройств для блокировки подозрительных операций.',
    code: `<span class="comment">// Упрощенная проверка на подозрительный платеж</span>
<span class="keyword">const</span> <span class="function">isFraud</span> = (tx) => tx.amount > <span class="number">10000</span> && !tx.isVerifiedDevice;`
  },
  {
    title: 'Аппроксимация',
    definition: 'Метод замены сложных математических объектов (функций, значений) более простыми и близкими к оригиналу, но удобными для вычислений.',
    relation: 'Используется, когда точное решение найти невозможно или слишком дорого по ресурсам: мы жертвуем точностью ради скорости.',
    code: `<span class="comment">// Пример: число π через округление</span>
<span class="keyword">const</span> <span class="variable">PI_APPROX</span> = <span class="number">3.14</span>; <span class="comment">// Для многих задач этой точности достаточно</span>`
  },
  {
    title: 'Дискретно-детерминированные модели',
    definition: 'Математические модели, описывающие системы, которые меняются скачкообразно (в конкретные моменты времени) и имеют строго предсказуемое поведение.',
    relation: 'Основа цифровой логики и компьютерных алгоритмов: состояние системы в момент T+1 полностью определяется состоянием в момент T.',
    code: `<span class="comment">// Модель конечного автомата (FSM)</span>
<span class="keyword">const</span> <span class="variable">machine</span> = { state: <span class="string">'IDLE'</span> };
<span class="function">transition</span>(machine, <span class="string">'START'</span>); <span class="comment">// Всегда перейдет в 'RUNNING'</span>`
  },
  {
    title: 'React.js',
    definition: 'JavaScript-библиотека для создания пользовательских интерфейсов с использованием компонентного подхода и декларативного управления состоянием.',
    relation: 'Эффективно обновляет DOM через механизм Virtual DOM, позволяя разработчику описывать UI как функцию от состояния.',
    code: `<span class="comment">// Функциональный компонент React</span>
<span class="keyword">const</span> <span class="function">App</span> = () => <span class="keyword">&lt;div&gt;</span>Hello, World!<span class="keyword">&lt;/div&gt;</span>;`
  },
  {
    title: 'Vercel',
    definition: 'Облачная платформа для деплоя и хостинга фронтенд-приложений (особенно Next.js), ориентированная на высокую производительность и CI/CD.',
    relation: 'Автоматизирует процесс доставки кода от Git-репозитория до глобальной сети доставки контента (Edge Network).',
    code: `<span class="comment">// vercel.json — конфигурация деплоя</span>
{ <span class="string">"version"</span>: <span class="number">2</span>, <span class="string">"framework"</span>: <span class="string">"nextjs"</span> }`
  },
  {
    title: 'JavaScript',
    definition: 'Мультипарадигменный язык программирования, являющийся основным инструментом для создания интерактивности в веб-браузерах и на сервере (Node.js).',
    relation: 'Связующее звено между пользователем и логикой приложения, поддерживающее асинхронность и событийную модель.',
    code: `<span class="comment">// Асинхронная операция в JS</span>
<span class="keyword">const</span> <span class="variable">data</span> = <span class="keyword">await</span> <span class="function">fetch</span>(<span class="string">'/api/data'</span>).<span class="function">json</span>();`
  },
  {
    title: 'Стандартная ошибка (SE)',
    definition: 'Статистическая величина, оценивающая изменчивость выборочного среднего. Показывает, насколько далеко выборочное среднее может находиться от истинного среднего популяции.',
    relation: 'Ключевой показатель точности: чем меньше стандартная ошибка, тем надежнее наши данные.',
    code: `<span class="comment">// SE = Standard Deviation / sqrt(n)</span>
<span class="keyword">const</span> <span class="variable">standardError</span> = <span class="function">stdDev</span>(sample) / Math.<span class="function">sqrt</span>(sample.length);`
  },
  {
    title: 'Коэффициент вариации (CV)',
    definition: 'Относительная мера разброса данных, выраженная в процентах. Рассчитывается как отношение стандартного отклонения к среднему арифметическому.',
    relation: 'Позволяет сравнивать изменчивость данных с разными единицами измерения или масштабами.',
    code: `<span class="comment">// CV = (σ / μ) * 100%</span>
<span class="keyword">const</span> <span class="variable">cv</span> = (<span class="function">stdDev</span>(data) / <span class="function">mean</span>(data)) * <span class="number">100</span>;`
  }
];

// ===== Instructions Data =====
const modelInstructions = {
  matrix: {
    title: 'Матричная инверсия',
    howTo: `
      <ol>
        <li><strong>Нажмите на ячейку</strong> в сетке</li>
        <li>Эта ячейка и 4 соседние (крест) <strong>переключатся</strong></li>
        <li>0 становится 1, 1 становится 0</li>
      </ol>
      <div class="win-condition">
        <strong>Цель:</strong> Все ячейки должны стать 1 (светлые)
      </div>
    `,
    goal: 'Зажгите все ячейки (все = 1)',
    goalNote: 'Каждый клик влияет на крест из соседних клеток. Подумайте, какие ячейки включать, чтобы освещать сразу несколько элементов.',
    service: 'Google Photos'
  },
  rings: {
    title: 'Вложенные циклы',
    howTo: `
      <ol>
        <li><strong>Нажмите на кольцо</strong> для вращения по часовой</li>
        <li><strong>Shift + клик</strong> - против часовой</li>
        <li>Внешние кольца <strong>слегка поворачивают</strong> внутренние</li>
        <li>Выровняйте <strong>яркие точки</strong> наверх</li>
      </ol>
      <div class="win-condition">
        <strong>Цель:</strong> Все яркие точки вверху (на 12 часов)
      </div>
    `,
    goal: 'Выровняйте все точки наверх',
    goalNote: 'Сосредоточьтесь на каждом кольце как на уровне. Один поворот меняет не только текущее, но и соседние кольца.',
    service: 'Spotify/YouTube'
  },
  graph: {
    title: 'Поиск пути в графе',
    howTo: `
      <ol>
        <li>Вы на <strong>зеленой</strong> вершине (Старт)</li>
        <li><strong>Нажмите на соседнюю</strong> вершину для перехода</li>
        <li>Ребра имеют <strong>стоимость</strong> и <strong>риск</strong></li>
        <li><strong>Нельзя превысить</strong> лимит риска!</li>
        <li>Кнопка <strong>Отмена</strong> - вернуться назад</li>
      </ol>
      <div class="win-condition">
        <strong>Цель:</strong> Дойти до красной вершины с минимальной стоимостью
      </div>
    `,
    goal: 'Минимизируйте стоимость пути',
    goalNote: 'Не выбирайте только самые дешевые ребра: ориентируйтесь на баланс стоимости и риска.',
    service: 'Kaspi.kz Antifraud'
  }
};

// ===== Cleanup Sidebar Listeners =====
function cleanupSidebarListeners() {
  if (sidebarMouseMoveHandler) {
    document.removeEventListener('mousemove', sidebarMouseMoveHandler);
    sidebarMouseMoveHandler = null;
  }
  if (sidebarMouseUpHandler) {
    document.removeEventListener('mouseup', sidebarMouseUpHandler);
    sidebarMouseUpHandler = null;
  }
}

// ===== Resizable Sidebars with Hide/Show =====
function initResizableSidebars() {
  // Clean up old listeners before reinitializing
  cleanupSidebarListeners();
  
  // Prevent duplicate initialization
  if (sidebarInitialized) return;

  const workspaceLayout = document.querySelector('.workspace-layout');
  const sidebarLeft = document.getElementById('sidebarLeft');
  const sidebarRight = document.getElementById('sidebarRight');
  
  // Early return if sidebars don't exist
  if (!sidebarLeft || !sidebarRight || !workspaceLayout) {
    console.warn('[SIDEBAR] Sidebar elements not found');
    return;
  }

  // Load saved sidebar widths from localStorage with error handling
  let savedLeftWidth = '220px';
  let savedRightWidth = '280px';
  let leftHidden = false;
  let rightHidden = false;
  let currentLeftWidth = savedLeftWidth;
  let currentRightWidth = savedRightWidth;
  
  try {
    savedLeftWidth = localStorage.getItem('algolab_sidebar_left_width') || '220px';
    savedRightWidth = localStorage.getItem('algolab_sidebar_right_width') || '280px';
    leftHidden = localStorage.getItem('algolab_sidebar_left_hidden') === 'true';
    rightHidden = localStorage.getItem('algolab_sidebar_right_hidden') === 'true';
  } catch (e) {
    console.warn('[SIDEBAR] Local storage read error:', e.message);
  }

  currentLeftWidth = savedLeftWidth;
  currentRightWidth = savedRightWidth;
  workspaceLayout.style.setProperty('--sidebar-left-width', leftHidden ? '0px' : currentLeftWidth);
  workspaceLayout.style.setProperty('--sidebar-right-width', rightHidden ? '0px' : currentRightWidth);
  
  if (leftHidden) sidebarLeft.classList.add('hidden');
  if (rightHidden) sidebarRight.classList.add('hidden');

  // Create hide/show buttons in headers (prevent duplicates)
  const leftHeader = sidebarLeft.querySelector('.sidebar-header');
  const rightHeader = sidebarRight.querySelector('.sidebar-header-right');
  
  // Remove existing toggle buttons if present
  const existingLeftBtn = leftHeader.querySelector('.sidebar-toggle');
  const existingRightBtn = rightHeader.querySelector('.sidebar-toggle');
  if (existingLeftBtn) existingLeftBtn.remove();
  if (existingRightBtn) existingRightBtn.remove();

  const existingOpenLeft = workspaceLayout.querySelector('.sidebar-open-left');
  const existingOpenRight = workspaceLayout.querySelector('.sidebar-open-right');
  if (existingOpenLeft) existingOpenLeft.remove();
  if (existingOpenRight) existingOpenRight.remove();
  
  const toggleLeftBtn = document.createElement('button');
  toggleLeftBtn.className = 'btn btn-icon sidebar-toggle';
  toggleLeftBtn.title = 'Скрыть панель';
  toggleLeftBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  
  const toggleRightBtn = document.createElement('button');
  toggleRightBtn.className = 'btn btn-icon sidebar-toggle';
  toggleRightBtn.title = 'Скрыть панель';
  toggleRightBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  
  leftHeader.appendChild(toggleLeftBtn);
  rightHeader.appendChild(toggleRightBtn);

  const leftOpenBtn = document.createElement('button');
  leftOpenBtn.className = 'btn btn-icon sidebar-open-toggle sidebar-open-left';
  leftOpenBtn.title = 'Показать левую панель';
  leftOpenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 6 15 12 9 18"></polyline></svg>';
  leftOpenBtn.style.display = leftHidden ? 'flex' : 'none';

  const rightOpenBtn = document.createElement('button');
  rightOpenBtn.className = 'btn btn-icon sidebar-open-toggle sidebar-open-right';
  rightOpenBtn.title = 'Показать правую панель';
  rightOpenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 6 9 12 15 18"></polyline></svg>';
  rightOpenBtn.style.display = rightHidden ? 'flex' : 'none';

  workspaceLayout.appendChild(leftOpenBtn);
  workspaceLayout.appendChild(rightOpenBtn);

  const updateSidebarButtons = () => {
    leftOpenBtn.style.display = sidebarLeft.classList.contains('hidden') ? 'flex' : 'none';
    rightOpenBtn.style.display = sidebarRight.classList.contains('hidden') ? 'flex' : 'none';
  };

  // Toggle left sidebar with localStorage error handling
  toggleLeftBtn.addEventListener('click', () => {
    const isHidden = sidebarLeft.classList.toggle('hidden');
    workspaceLayout.style.setProperty('--sidebar-left-width', isHidden ? '0px' : currentLeftWidth);
    toggleLeftBtn.title = isHidden ? 'Показать панель' : 'Скрыть панель';
    updateSidebarButtons();
    try {
      localStorage.setItem('algolab_sidebar_left_hidden', isHidden);
    } catch (e) {
      console.warn('[SIDEBAR] Failed to save left sidebar state:', e.message);
    }
  });

  leftOpenBtn.addEventListener('click', () => {
    sidebarLeft.classList.remove('hidden');
    workspaceLayout.style.setProperty('--sidebar-left-width', currentLeftWidth);
    toggleLeftBtn.title = 'Скрыть панель';
    updateSidebarButtons();
    try {
      localStorage.setItem('algolab_sidebar_left_hidden', false);
    } catch (e) {
      console.warn('[SIDEBAR] Failed to save left sidebar state:', e.message);
    }
  });

  // Toggle right sidebar with localStorage error handling
  toggleRightBtn.addEventListener('click', () => {
    const isHidden = sidebarRight.classList.toggle('hidden');
    workspaceLayout.style.setProperty('--sidebar-right-width', isHidden ? '0px' : currentRightWidth);
    toggleRightBtn.title = isHidden ? 'Показать панель' : 'Скрыть панель';
    updateSidebarButtons();
    // Update chart after sidebar state change
    setTimeout(() => updateProgressChart(), 300);
    try {
      localStorage.setItem('algolab_sidebar_right_hidden', isHidden);
    } catch (e) {
      console.warn('[SIDEBAR] Failed to save right sidebar state:', e.message);
    }
  });

  rightOpenBtn.addEventListener('click', () => {
    sidebarRight.classList.remove('hidden');
    workspaceLayout.style.setProperty('--sidebar-right-width', currentRightWidth);
    toggleRightBtn.title = 'Скрыть панель';
    updateSidebarButtons();
    // Update chart after sidebar state change
    setTimeout(() => updateProgressChart(), 300);
    try {
      localStorage.setItem('algolab_sidebar_right_hidden', false);
    } catch (e) {
      console.warn('[SIDEBAR] Failed to save right sidebar state:', e.message);
    }
  });

  let isResizing = false;
  let resizeType = null;
  let startX = 0;
  let startWidth = 0;

  // Constants for resize constraints
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 600;
  const RESIZE_ZONE = 8;

  // Detect resize on left sidebar
  sidebarLeft.addEventListener('mousedown', (e) => {
    if (sidebarLeft.classList.contains('hidden')) return;
    const rect = sidebarLeft.getBoundingClientRect();
    if (Math.abs(e.clientX - rect.right) > RESIZE_ZONE) return;
    
    isResizing = true;
    resizeType = 'left';
    startX = e.clientX;
    startWidth = sidebarLeft.offsetWidth;
    workspaceLayout.style.transition = 'none';
    sidebarLeft.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  });

  // Detect resize on right sidebar
  sidebarRight.addEventListener('mousedown', (e) => {
    if (sidebarRight.classList.contains('hidden')) return;
    const rect = sidebarRight.getBoundingClientRect();
    if (Math.abs(e.clientX - rect.left) > RESIZE_ZONE) return;
    
    isResizing = true;
    resizeType = 'right';
    startX = e.clientX;
    startWidth = sidebarRight.offsetWidth;
    workspaceLayout.style.transition = 'none';  
    sidebarRight.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  });

  // Mouse move handler with constraints
  sidebarMouseMoveHandler = (e) => {
    if (!isResizing) return;

    const delta = e.clientX - startX;
    let newWidth;
    
    if (resizeType === 'left') {
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      currentLeftWidth = newWidth + 'px';
      workspaceLayout.style.setProperty('--sidebar-left-width', currentLeftWidth);
      try {
        localStorage.setItem('algolab_sidebar_left_width', currentLeftWidth);
      } catch (e) {
        console.warn('[SIDEBAR] Failed to save left width:', e.message);
        if (e.name === 'QuotaExceededError') {
          showToast('Хранилище переполнено. Очистите браузер.', 'error');
        }
      }
    } else if (resizeType === 'right') {
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth - delta));
      currentRightWidth = newWidth + 'px';
      workspaceLayout.style.setProperty('--sidebar-right-width', currentRightWidth);
      // Update chart in real-time during resize
      updateProgressChart();
      try {
        localStorage.setItem('algolab_sidebar_right_width', currentRightWidth);
      } catch (e) {
        console.warn('[SIDEBAR] Failed to save right width:', e.message);
        if (e.name === 'QuotaExceededError') {
          showToast('Хранилище переполнено. Очистите браузер.', 'error');
        }
      }
    }
  };
  document.addEventListener('mousemove', sidebarMouseMoveHandler);

  // Mouse up handler
  sidebarMouseUpHandler = () => {
    if (isResizing) {
      isResizing = false;
      resizeType = null;
      workspaceLayout.style.transition = '';
      sidebarLeft.style.userSelect = '';
      sidebarRight.style.userSelect = '';
      document.body.style.cursor = 'default';
    }
  };
  document.addEventListener('mouseup', sidebarMouseUpHandler);
  
  sidebarInitialized = true;
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  syncResponsiveConfigWithCSS();
  setupGraphResponsiveHandlers();
  loadFromStorage();
  initNavigation();
  initDashboard();
  initWorkspace();
  initGlossary();
  initStatistics();
  
  // Initialize sidebar if workspace is active on initial load
  const workspaceSection = document.getElementById('workspace');
  if (workspaceSection && workspaceSection.classList.contains('active')) {
    initResizableSidebars();
  }
  
  if (state.shouldRestoreMatrix) {
    startModel('matrix', true, false);
  }
  window.addEventListener('beforeunload', saveToStorage);
});

// ===== Navigation =====
function initNavigation() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!hamburgerBtn || !mobileMenu) {
    return;
  }

  // Toggle menu
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburgerBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  // Close menu on link click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      hamburgerBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });

  // Start session button
  const startSessionBtn = document.getElementById('startSession');
  if (startSessionBtn) {
    startSessionBtn.addEventListener('click', () => {
      navigateTo('dashboard');
      state.sessionStart = Date.now();
      saveToStorage();
      hamburgerBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  }

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hamburgerBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    }
  });

  // Add click handler for landing page service cards
  const landingServiceCards = document.querySelectorAll('#landing .service-card[data-service]');
  landingServiceCards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const service = card.getAttribute('data-service');
      navigateTo('dashboard');
      state.sessionStart = Date.now();
      saveToStorage();
      hamburgerBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

function navigateTo(pageName) {
  state.currentPage = pageName;
  
  // Clear session timer when leaving workspace
  if (pageName !== 'workspace' && sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
  
  // Reset sidebar initialization flag and cleanup when leaving workspace
  if (pageName !== 'workspace') {
    sidebarInitialized = false;
    cleanupSidebarListeners();
  }
  
  pages.forEach(page => {
    page.classList.remove('active');
    if (page.id === pageName) {
      page.classList.add('active');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    }
  });

  if (pageName === 'statistics') {
    updateStatistics();
  }
  
  // Re-initialize sidebar when entering workspace
  if (pageName === 'workspace') {
    setTimeout(() => {
      if (!sidebarInitialized) {
        initResizableSidebars();
      }
    }, 50);
  }

  window.scrollTo(0, 0);
  saveToStorage();
}

// ===== Dashboard Model Selection =====
function initDashboard() {
  const modelButtons = document.querySelectorAll('.btn-card[data-model]');
  const difficultyButtons = document.querySelectorAll('[data-difficulty]');
  difficultyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove active from all buttons in the same group
      const group = button.parentElement;
      group.querySelectorAll('[data-difficulty]').forEach(opt => opt.classList.remove('active'));
      button.classList.add('active');
      const model = button.closest('.service-card').querySelector('.btn-card').dataset.model;
      setDifficultyForModel(model, button.dataset.difficulty);
      saveToStorage();
    });
  });
  
  const difficultyGroups = document.querySelectorAll('[data-model] .difficulty-group');
  difficultyGroups.forEach(group => {
    const buttons = group.querySelectorAll('button');
    const model = group.closest('.service-card').querySelector('.btn-card').dataset.model;
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        buttons.forEach(opt => opt.classList.remove('active'));
        button.classList.add('active');
        setDifficultyForModel(model, button.dataset.difficulty);
        saveToStorage();
      });
    });
  });
  
  modelButtons.forEach(button => {
    button.addEventListener('click', () => {
      const model = button.dataset.model;
      startModel(model);
    });
  });
  
  // Initialize active difficulty states
  document.querySelectorAll('.service-card').forEach(card => {
    const btnCard = card.querySelector('.btn-card');
    if (!btnCard) return; // Skip cards without model button (e.g., on landing page)
    const model = btnCard.dataset.model;
    const currentDifficulty = getDifficultyForModel(model);
    const difficultyButtons = card.querySelectorAll('[data-difficulty]');
    difficultyButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.difficulty === currentDifficulty) {
        btn.classList.add('active');
      }
    });
    // Update label
    const picker = card.querySelector('.difficulty-picker');
    if (picker) {
      const label = picker.querySelector('span');
      if (label) {
        // Leave label as is
      }
    }
  });
}

function getDifficultyForModel(model) {
  if (model === 'matrix') return state.matrixDifficulty;
  if (model === 'rings') return state.ringsDifficulty;
  if (model === 'graph') return state.graphDifficulty;
  return 'medium';
}

function setDifficultyForModel(model, difficulty) {
  if (model === 'matrix') {
    state.matrixDifficulty = difficulty;
    state.matrixSave = null; // Clear save when difficulty changes
  }
  else if (model === 'rings') state.ringsDifficulty = difficulty;
  else if (model === 'graph') state.graphDifficulty = difficulty;
}

function getMatrixSize(difficulty) {
  const sizes = {
    easy: 4,
    medium: 5,
    hard: 6
  };
  return sizes[difficulty] || 5;
}

function startModel(modelType, restore = false, showModal = false) {
  // Actual game initialization
  state.currentModel = modelType;
  state.moves = 0;
  state.progress = 0;
  state.isGameWon = false;
  state.sessionStart = Date.now();
  state.moveHistory = [];
  
  const difficulty = getDifficultyForModel(modelType);
  
  logTerminal(`[SYSTEM]: Выбрана сложность: ${getDifficultyLabel(difficulty)}`, 'info');
  
  navigateTo('workspace');
  
  const canvas = document.getElementById('mainCanvas');
  const title = document.getElementById('canvasTitle');
  const goalPanel = document.getElementById('goalPanel');
  const goalContent = document.getElementById('goalContent');
  const completeBtn = document.getElementById('completeTask');
  
  canvas.innerHTML = '';
  completeBtn.style.display = 'none';
  goalPanel.style.display = 'block';
  
  clearTerminal();
  logTerminal('[SYSTEM]: Загрузка модели...', 'event');
  
  const modelInfo = modelInstructions[modelType];
  const difficultyLabel2 = `<div class="goal-difficulty">Уровень: <strong>${getDifficultyLabel(difficulty)}</strong></div>`;
  const goalNote = modelInfo.goalNote ? `<div class="goal-explain">${modelInfo.goalNote}</div>` : '';
  goalContent.innerHTML = `
    <div class="goal-callout">${modelInfo.goal}</div>
    ${difficultyLabel2}
    ${goalNote}
  `;
  
  // Service branding
  const serviceInfo = {
    matrix: {
      name: '<svg style="width:16px;height:16px;margin-right:6px;vertical-align:middle;display:inline-block;" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="8" height="8" fill="#4285F4"/><rect x="14" y="2" width="8" height="8" fill="#EA4335"/><rect x="2" y="14" width="8" height="8" fill="#FBBC04"/><rect x="14" y="14" width="8" height="8" fill="#34A853"/></svg>Google Photos',
      textName: 'Google Photos',
      color: '#4285F4'
    },
    rings: {
      name: '<svg style="width:16px;height:16px;margin-right:6px;vertical-align:middle;display:inline-block;" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2"><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="11"/></svg>Spotify',
      textName: 'Spotify',
      color: '#1DB954'
    },
    graph: {
      name: '<svg style="width:16px;height:16px;margin-right:6px;vertical-align:middle;display:inline-block;" viewBox="0 0 24 24" fill="#FF0033"><rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="2" width="4" height="16" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/></svg>Kaspi.kz',
      textName: 'Kaspi.kz',
      color: '#FF0033'
    }
  };
  
  const service = serviceInfo[modelType];
  canvas.style.borderTopColor = service.color;
  canvas.style.borderTopWidth = '3px';
  canvas.style.borderTopStyle = 'solid';
  
  title.innerHTML = `<span style="color: ${service.color}; font-weight: 700;">${service.name}</span> — ${modelInfo.title}`;
  
  switch (modelType) {
    case 'matrix':
      if (!restore && state.matrixSave && state.matrixSave.matrix && state.matrixDifficulty === difficulty) {
        restoreMatrixGame(canvas, state.matrixSave);
      } else {
        initMatrixGame(canvas, difficulty);
      }
      break;
    case 'rings':
      initRingsGame(canvas, difficulty);
      break;
    case 'graph':
      try {
        initGraphGame(canvas, difficulty);
      } catch (error) {
        console.error('[GRAPH] Error in initGraphGame:', error);
        showToast('Ошибка инициализации графа', 'error');
        // Clear canvas on error
        canvas.innerHTML = '';
      }
      break;
  }
  
  startSessionTimer();
  initProgressChart();
  
  if (state.shouldRestoreMatrix) {
    state.shouldRestoreMatrix = false;
  }
  
  logTerminal('[SYSTEM]: Модель готова', 'success');
  logTerminal(`[SERVICE]: ${service.textName}`, 'info');
  logTerminal('[INFO]: Начните взаимодействие');
  
  // Show help modal on first launch (unless restore)
  if (!restore && !state.helpShown[modelType]) {
    state.helpShown[modelType] = true;
    setTimeout(() => {
      showHelpModal(modelType);
    }, 500);
  }
  
  saveToStorage();
}

// ===== Matrix Game =====
function initMatrixGame(container, difficulty = 'medium') {
  const size = getMatrixSize(difficulty);
  logTerminal(`[SYSTEM]: Матрица ${size}x${size}`, 'info');
  const matrix = buildMatrixPuzzle(size, difficulty);
  
  // Calculate cell size based on available canvas width (prevents overflow on very small devices)
  const containerWidth = Math.max(240, container.getBoundingClientRect().width || window.innerWidth);
  let gap = window.innerWidth <= 390 ? 2 : window.innerWidth <= 480 ? 3 : window.innerWidth <= 768 ? 4 : 8;
  const paddingAllowance = 18; // breathing room inside canvas
  const maxCellByWidth = Math.floor((containerWidth - paddingAllowance - gap * (size - 1)) / size);
  let cellSize = window.innerWidth <= 480 ? 60 : window.innerWidth <= 768 ? 65 : 85;
  cellSize = Math.max(38, Math.min(cellSize, maxCellByWidth));
  
  const grid = document.createElement('div');
  grid.className = 'matrix-grid';
  grid.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  grid.style.gap = `${gap}px`;
  
  // Render grid
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = document.createElement('div');
      cell.className = `matrix-cell ${matrix[i][j] ? 'on' : 'off'}`;
      cell.textContent = matrix[i][j];
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      
      cell.addEventListener('click', () => {
        const currentMatrix = container.matrixData.matrix;
        const currentSize = container.matrixData.size;
        handleMatrixClick(currentMatrix, i, j, grid, currentSize);
      });
      
      grid.appendChild(cell);
    }
  }
  
  container.appendChild(grid);
  container.matrixData = { matrix, size };
  updateProgress(matrix);
}

function restoreMatrixGame(container, save) {
  const size = save.size;
  const matrix = save.matrix.map(row => [...row]);
  
  // Calculate cell size based on available canvas width (prevents overflow on very small devices)
  const containerWidth = Math.max(240, container.getBoundingClientRect().width || window.innerWidth);
  let gap = window.innerWidth <= 390 ? 2 : window.innerWidth <= 480 ? 3 : window.innerWidth <= 768 ? 4 : 8;
  const paddingAllowance = 18;
  const maxCellByWidth = Math.floor((containerWidth - paddingAllowance - gap * (size - 1)) / size);
  let cellSize = window.innerWidth <= 480 ? 60 : window.innerWidth <= 768 ? 65 : 85;
  cellSize = Math.max(38, Math.min(cellSize, maxCellByWidth));
  
  const grid = document.createElement('div');
  grid.className = 'matrix-grid';
  grid.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  grid.style.gap = `${gap}px`;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = document.createElement('div');
      cell.className = `matrix-cell ${matrix[i][j] ? 'on' : 'off'}`;
      cell.textContent = matrix[i][j];
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;

      cell.addEventListener('click', () => {
        const currentMatrix = container.matrixData.matrix;
        const currentSize = container.matrixData.size;
        handleMatrixClick(currentMatrix, i, j, grid, currentSize);
      });

      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);
  container.matrixData = { matrix, size };
  state.moveHistory = (save.moveHistory || []).map(history => JSON.stringify(history));
  state.moves = save.moves || 0;
  state.progress = save.progress || state.progress;
  updateMovesCount();
  updateProgress(matrix);
}

function buildMatrixPuzzle(size, difficulty) {
  const thresholds = {
    easy: [2, 6],
    medium: [7, 11],
    hard: [12, 18]
  };
  const [minMoves, maxMoves] = thresholds[difficulty] || thresholds.medium;
  let bestCandidate = null;
  let bestDistance = Infinity;
  let bestCount = -1;
  let attempts = 0;
  const maxAttempts = 500;  // Increased from 250

  while (attempts < maxAttempts) {
    const candidate = generateRandomMatrix(size, difficulty);
    const minCount = getMinimalMatrixMoves(candidate);
    
    // Perfect match - return immediately
    if (minCount >= minMoves && minCount <= maxMoves) {
      return candidate;
    }

    // Only consider solvable puzzles (minCount >= 0)
    if (minCount >= 0) {
      const target = (minMoves + maxMoves) / 2;
      const distance = Math.abs(minCount - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCandidate = candidate;
        bestCount = minCount;
      }
    }

    attempts += 1;
  }

  // Return best candidate if it's solvable
  if (bestCandidate && bestCount >= 0) {
    return bestCandidate;
  }
  
  // Fallback: generate with relaxed constraints
  console.warn('[MATRIX] Could not find puzzle within thresholds, using relaxed constraints');
  let fallbackBest = null;
  let fallbackDistance = Infinity;
  for (let i = 0; i < 100; i++) {
    const candidate = generateRandomMatrix(size, difficulty);
    const minCount = getMinimalMatrixMoves(candidate);
    if (minCount >= 0) {
      const distance = Math.abs(minCount - 5);  // Target ~5 moves for fallback
      if (distance < fallbackDistance) {
        fallbackDistance = distance;
        fallbackBest = candidate;
      }
    }
  }
  
  return fallbackBest || generateRandomMatrix(size, difficulty);
}

function generateRandomMatrix(size, difficulty) {
  const matrix = Array.from({ length: size }, () => Array(size).fill(1));
  const pressRanges = {
    easy: [2, 5],
    medium: [6, 10],
    hard: [11, 16]
  };
  const [minPresses, maxPresses] = pressRanges[difficulty] || pressRanges.medium;
  const presses = minPresses + Math.floor(Math.random() * (maxPresses - minPresses + 1));

  for (let k = 0; k < presses; k++) {
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    applyMatrixXOR(matrix, row, col, size);
  }

  return matrix;
}

function getMinimalMatrixMoves(matrix) {
  const size = matrix.length;
  let best = Infinity;
  const target = 1;

  for (let mask = 0; mask < (1 << size); mask++) {
    const state = matrix.map(row => [...row]);
    const press = Array.from({ length: size }, () => Array(size).fill(0));

    for (let j = 0; j < size; j++) {
      if ((mask >> j) & 1) {
        press[0][j] = 1;
        pressCell(state, 0, j, size);
      }
    }

    for (let i = 0; i < size - 1; i++) {
      for (let j = 0; j < size; j++) {
        if (state[i][j] !== target) {
          press[i + 1][j] = 1;
          pressCell(state, i + 1, j, size);
        }
      }
    }

    if (state[size - 1].every(v => v === target)) {
      const count = press.reduce((sum, row) => sum + row.reduce((s, value) => s + value, 0), 0);
      if (count < best) {
        best = count;
      }
    }
  }

  return best === Infinity ? -1 : best;
}

function pressCell(state, row, col, size) {
  const positions = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ];

  positions.forEach(([r, c]) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      state[r][c] ^= 1;
    }
  });
}

function applyMatrixXOR(matrix, row, col, size) {
  const positions = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ];
  
  positions.forEach(([r, c]) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] ^= 1;
    }
  });
}

function handleMatrixClick(matrix, row, col, grid, size) {
  // Save state for undo (with size limit to prevent memory bloat)
  state.moveHistory.push(JSON.stringify(matrix));
  if (state.moveHistory.length > 100) {
    state.moveHistory.shift();  // Remove oldest entry
  }
  
  const cells = grid.querySelectorAll('.matrix-cell');
  
  // XOR the clicked cell and neighbors
  const positions = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ];
  
  positions.forEach(([r, c]) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] ^= 1;
      const idx = r * size + c;
      const cell = cells[idx];
      cell.className = `matrix-cell ${matrix[r][c] ? 'on' : 'off'}`;
      cell.textContent = matrix[r][c];
    }
  });
  
  state.moves++;
  updateMovesCount();
  updateProgress(matrix);
  
  logTerminal(`[EVENT]: Ячейка (${row},${col}) - XOR применен`, 'event');
  
  // Check win condition
  const allOnes = matrix.flat().every(v => v === 1);
  if (allOnes) {
    handleWin('matrix');
  }
  
  saveToStorage();
}

function updateProgress(matrix) {
  const total = matrix.flat().length;
  const ones = matrix.flat().filter(v => v === 1).length;
  state.progress = Math.round((ones / total) * 100);
  
  document.getElementById('entropyValue').textContent = state.progress + '%';
  document.getElementById('entropyBar').style.width = state.progress + '%';
  
  state.progressHistory.push(state.progress);
  if (state.progressHistory.length > 20) {
    state.progressHistory.shift();
  }
  updateProgressChart();
}

// ===== Rings Game =====
function initRingsGame(container, difficulty = 'medium') {
  const ringsContainer = document.createElement('div');
  ringsContainer.className = 'rings-container';
  
  // Rings with markers that need to be at top (0 degrees)
  const sectorsConfig = {
    easy: [6, 4],
    medium: [8, 6, 4],
    hard: [10, 8, 6, 4]
  };
  const sectors = sectorsConfig[difficulty] || sectorsConfig.medium;
  logTerminal(`[SYSTEM]: Кольца: ${sectors.join(', ')} секторов`, 'info');
  
  const numRings = sectors.length;
  const colors = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b'];
  const names = ['Внешнее', 'Среднее', 'Внутреннее', 'Центральное'];

  const ringsLayout = getRingsLayoutConfig(numRings);
  ringsContainer.style.width = `${ringsLayout.containerSize}px`;
  ringsContainer.style.height = `${ringsLayout.containerSize}px`;
  ringsContainer.style.setProperty('--rings-top-marker-offset', `${ringsLayout.topMarkerOffset}px`);
  ringsContainer.style.setProperty('--rings-arrow-half', `${ringsLayout.arrowHalf}px`);
  ringsContainer.style.setProperty('--rings-arrow-height', `${ringsLayout.arrowHeight}px`);

  // Use responsive sizing via data attribute
  ringsContainer.dataset.difficulty = difficulty;
  
  const rings = [];
  const outerRadius = Math.floor(ringsLayout.containerSize * 0.47);
  // Keep rings closer together to avoid "too much air" on desktop.
  // Gap is derived from available radius to stay consistent across screens.
  const ringGap = Math.max(20, Math.floor(outerRadius / (numRings + 1.2)));
  for (let i = 0; i < numRings; i++) {
    rings.push({
      radius: outerRadius - i * ringGap,
      sectors: sectors[i],
      step: 0,
      color: colors[i],
      name: names[i]
    });
  }
  
  // Generate solvable puzzle by applying random moves to solved state
  buildRingsPuzzle(rings, difficulty);
  
  rings.forEach((ring, index) => {
    const ringEl = createRingElement(ring, index, rings, ringsContainer);
    ringsContainer.appendChild(ringEl);
  });
  
  // Target indicator in center
  const target = document.createElement('div');
  target.className = 'ring-target';
  target.innerHTML = '<span style="font-size: 10px;">TOP</span>';
  ringsContainer.appendChild(target);
  
  // Top marker
  const topMarker = document.createElement('div');
  topMarker.className = 'rings-top-marker';
  ringsContainer.appendChild(topMarker);
  
  container.appendChild(ringsContainer);
  container.ringsData = rings;
  updateRingsProgress(rings);
}

function buildRingsPuzzle(rings, difficulty) {
  const moveCounts = {
    easy: [5, 10],
    medium: [10, 18],
    hard: [18, 30]
  };
  const maxTries = 16;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    rings.forEach(r => { r.step = 0; });
    const [minMoves, maxMoves] = moveCounts[difficulty] || moveCounts.medium;
    const numMoves = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;

    for (let i = 0; i < numMoves; i++) {
      const ringIndex = Math.floor(Math.random() * rings.length);
      const direction = Math.random() < 0.5 ? -1 : 1;
      applyRingsMove(rings, ringIndex, direction, difficulty);
    }

    const isSolved = rings.every(r => {
      return ((r.step % r.sectors) + r.sectors) % r.sectors === 0;
    });
    const misalignedCount = rings.filter(r => {
      return ((r.step % r.sectors) + r.sectors) % r.sectors !== 0;
    }).length;
    const totalDistance = rings.reduce((acc, ring) => {
      const s = ((ring.step % ring.sectors) + ring.sectors) % ring.sectors;
      const distSteps = Math.min(s, ring.sectors - s);
      return acc + distSteps;
    }, 0);
    const minDistanceByDifficulty = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : 12;
    if (!isSolved && misalignedCount >= Math.min(rings.length, difficulty === 'hard' ? 4 : 3) && totalDistance >= minDistanceByDifficulty) {
      return;
    }
  }
}

function applyRingsMove(rings, ringIndex, direction, difficulty = 'medium') {
  const coupling = {
    easy: [1, 0, 0, 0],
    medium: [1, 1, 0, 0],
    hard: [1, 1, 1, 0]
  };
  const weights = coupling[difficulty] || coupling.medium;

  const applySteps = (ring, deltaSteps) => {
    ring.step = ((ring.step + deltaSteps) % ring.sectors + ring.sectors) % ring.sectors;
  };

  // Back-coupling to outer rings (adds planning difficulty).
  // Still always solvable because we scramble from a solved state using the same move rule.
  const outerCoupling = {
    easy: [],
    medium: [{ dist: 1, weight: -1 }],
    hard: [{ dist: 1, weight: -1 }, { dist: 2, weight: -1 }]
  };
  const outerWeights = outerCoupling[difficulty] || outerCoupling.medium;

  applySteps(rings[ringIndex], direction * 1);
  for (let i = ringIndex + 1; i < rings.length; i++) {
    const distance = i - ringIndex;
    const weight = weights[distance - 1] || 0;
    if (weight === 0) continue;
    applySteps(rings[i], direction * weight);
  }

  for (const rule of outerWeights) {
    const outerIndex = ringIndex - rule.dist;
    if (outerIndex < 0) continue;
    applySteps(rings[outerIndex], direction * rule.weight);
  }
}

function getRingRotationDeg(ring) {
  return (ring.step * (360 / ring.sectors)) % 360;
}

function createRingElement(ringData, index, allRings, container) {
  const ring = document.createElement('div');
  ring.className = 'ring';
  ring.style.width = ringData.radius * 2 + 'px';
  ring.style.height = ringData.radius * 2 + 'px';
  ring.style.left = `calc(50% - ${ringData.radius}px)`;
  ring.style.top = `calc(50% - ${ringData.radius}px)`;
  ring.style.borderColor = ringData.color;
  ring.style.transform = `rotate(${getRingRotationDeg(ringData)}deg)`;
  ring.dataset.index = index;
  
  // Adaptive marker size based on radius
  let markerSize = 24;
  let markerBoxShadow = '0 0 15px';
  
  if (ringData.radius < 100) {
    markerSize = 18;
    markerBoxShadow = '0 0 10px';
  } else if (ringData.radius < 150) {
    markerSize = 20;
    markerBoxShadow = '0 0 12px';
  }
  
  // Main marker (bright dot at top when rotation=0)
  const marker = document.createElement('div');
  marker.style.cssText = `
    position: absolute;
    width: ${markerSize}px;
    height: ${markerSize}px;
    background: ${ringData.color};
    border-radius: 50%;
    top: -${markerSize / 2}px;
    left: calc(50% - ${markerSize / 2}px);
    box-shadow: ${markerBoxShadow} ${ringData.color};
  `;
  ring.appendChild(marker);
  
  // Click handler
  ring.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Save state for undo (with size limit)
    state.moveHistory.push(JSON.stringify(allRings.map(r => r.step)));
    if (state.moveHistory.length > 100) {
      state.moveHistory.shift();
    }
    
    const direction = e.shiftKey ? -1 : 1;
    const currentDifficulty = container.dataset.difficulty || 'medium';
    applyRingsMove(allRings, index, direction, currentDifficulty);

    // Render all rings after move (keeps transforms consistent)
    for (let i = 0; i < allRings.length; i++) {
      const ringEl = container.children[i];
      if (ringEl) {
        ringEl.style.transform = `rotate(${getRingRotationDeg(allRings[i])}deg)`;
      }
    }
    
    state.moves++;
    updateMovesCount();
    updateRingsProgress(allRings);
    
    logTerminal(`[EVENT]: ${ringData.name} кольцо повернуто на ${direction > 0 ? '+' : '-'}1 шаг`, 'event');
    
    // Check win (exact discrete alignment)
    const aligned = allRings.every(r => ((r.step % r.sectors) + r.sectors) % r.sectors === 0);
    
    if (aligned) {
      handleWin('rings');
    }
    
    saveToStorage();
  });
  
  return ring;
}

function getRingsLayoutConfig(numRings) {
  const width = window.innerWidth;
  let containerSize;
  if (width <= 414) containerSize = 300;
  else if (width <= 480) containerSize = 340;
  else if (width <= 768) containerSize = 400;
  else if (width <= 1024) containerSize = 460;
  else containerSize = 520;

  if (numRings >= 4) {
    containerSize = Math.max(250, containerSize - 10);
  }

  return {
    containerSize,
    // Lift the arrow so it doesn't overlap the outer ring.
    topMarkerOffset: Math.round(containerSize * -0.06),
    // Keep arrow visible but not huge.
    arrowHalf: Math.max(10, Math.round(containerSize * 0.035)),
    arrowHeight: Math.max(14, Math.round(containerSize * 0.05))
  };
}

function updateRingsProgress(rings) {
  let totalAlignment = 0;
  
  rings.forEach(ring => {
    const s = ((ring.step % ring.sectors) + ring.sectors) % ring.sectors;
    const distSteps = Math.min(s, ring.sectors - s);
    const alignment = 1 - (distSteps / Math.max(1, ring.sectors / 2));
    totalAlignment += alignment;
  });
  
  state.progress = Math.round((totalAlignment / rings.length) * 100);
  document.getElementById('entropyValue').textContent = state.progress + '%';
  document.getElementById('entropyBar').style.width = state.progress + '%';
  
  state.progressHistory.push(state.progress);
  if (state.progressHistory.length > 20) {
    state.progressHistory.shift();
  }
  updateProgressChart();
}

// ===== Graph Game - COMPLETELY REDESIGNED =====
function initGraphGame(container, difficulty = 'medium') {
  console.log('[GRAPH] Starting initGraphGame with difficulty:', difficulty);
  console.time('initGraphGame');
  
  // Clear previous content efficiently to prevent lag
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  console.log('[GRAPH] Container cleared');
  
  const graphContainer = document.createElement('div');
  graphContainer.className = 'graph-container';
  graphContainer.style.visibility = 'hidden';
  container.appendChild(graphContainer);
  console.log('[GRAPH] Graph container created');
  
  const graphBounds = graphContainer.getBoundingClientRect();
  const graphDimensions = getEffectiveDimensions(graphBounds.width, graphBounds.height);
  const graphWidth = graphDimensions.width;
  const graphHeight = graphDimensions.height;
  graphContainer.style.visibility = 'visible';
  
  const maxRisk = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 20;
  const minMoves = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8;
  logTerminal(`[SYSTEM]: Макс. риск: ${maxRisk}`, 'info');
  logTerminal(`[SYSTEM]: Минимум ходов в этой сложности: ${minMoves}`, 'info');
  
  console.log('[GRAPH] Generating random graph...');
  console.time('generateRandomGraph');
  const responsiveConfig = getResponsiveConfig();
  let { nodes, edges, optimalPath } = generateValidatedGraph(difficulty, graphWidth, graphHeight, minMoves, maxRisk, responsiveConfig);
  console.timeEnd('generateRandomGraph');
  console.log('[GRAPH] Generated nodes:', nodes.length, 'edges:', edges.length);
  logTerminal(`[SYSTEM]: Макс. риск: ${maxRisk}`, 'info');
  logTerminal(`[SYSTEM]: Минимум ходов в этой сложности: ${minMoves}`, 'info');
  
  // Graph is prevalidated by generateValidatedGraph (solvable + no trivial shortcuts).
  
  const graphState = {
    currentNode: 'S',
    path: ['S'],
    totalCost: 0,
    totalRisk: 0,
    visitedEdges: []
  };
  
  // Build adjacency map for fast edge lookup
  const adjMap = {};
  edges.forEach(edge => {
    if (!adjMap[edge.from]) adjMap[edge.from] = {};
    adjMap[edge.from][edge.to] = edge;
  });
  
  // Draw edges
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    
    const edgeEl = document.createElement('div');
    edgeEl.className = 'graph-edge';
    edgeEl.dataset.from = edge.from;
    edgeEl.dataset.to = edge.to;
    
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const nodeRadius = responsiveConfig.nodeSize / 2;
    edgeEl.style.left = (fromNode.x + nodeRadius) + 'px';
    edgeEl.style.top = (fromNode.y + nodeRadius) + 'px';
    edgeEl.style.width = length + 'px';
    edgeEl.style.transform = `rotate(${angle}deg)`;
    
    graphContainer.appendChild(edgeEl);
    
    // No edge labels to reduce DOM elements
  });
  
  // Single tooltip for all nodes
  const tooltip = document.createElement('div');
  tooltip.className = 'node-tooltip';
  tooltip.style.display = 'none';
  tooltip.style.position = 'absolute';
  tooltip.style.background = 'rgba(0,0,0,0.9)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '1000';
  tooltip.style.pointerEvents = 'none';
  graphContainer.appendChild(tooltip);
  
  // Draw nodes
  nodes.forEach(node => {
    const nodeEl = document.createElement('div');
    nodeEl.className = `graph-node ${node.type || ''}`;
    nodeEl.textContent = node.label;
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';
    nodeEl.style.width = `${responsiveConfig.nodeSize}px`;
    nodeEl.style.height = `${responsiveConfig.nodeSize}px`;
    nodeEl.style.fontSize = `${Math.max(11, Math.round(responsiveConfig.nodeSize * 0.25))}px`;
    nodeEl.dataset.id = node.id;
    
    if (node.id === 'S') {
      nodeEl.classList.add('current');
    }
    
    nodeEl.addEventListener('mouseenter', () => {
      const edge = adjMap[graphState.currentNode] && adjMap[graphState.currentNode][node.id];
      if (edge) {
        const newCost = graphState.totalCost + edge.cost;
        const newRisk = graphState.totalRisk + edge.risk;
        const canMove = newRisk <= maxRisk && !graphState.path.includes(node.id);
        
        tooltip.innerHTML = `
          <div class="tooltip-title">${node.label}</div>
          <div class="tooltip-info">
            <div>Стоимость ребра: ${edge.cost} ₸</div>
            <div>Риск ребра: ${edge.risk}</div>
            <div>Итого стоимость: ${newCost} ₸</div>
            <div>Итого риск: ${newRisk}/${maxRisk}</div>
            <div class="tooltip-status ${canMove ? 'possible' : 'impossible'}">
              ${canMove ? 'Возможно перейти' : 'Невозможно (риск или уже посещено)'}
            </div>
          </div>
        `;
        tooltip.style.left = (node.x + 60) + 'px';
        tooltip.style.top = (node.y - 20) + 'px';
        tooltip.style.display = 'block';
      }
    });
    
    nodeEl.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
    
    nodeEl.addEventListener('click', () => {
      handleGraphClick(node.id, nodes, adjMap, graphState, graphContainer, maxRisk, optimalPath);
    });
    
    graphContainer.appendChild(nodeEl);
  });
  
  // Highlight available moves
  highlightAvailable(graphContainer, graphState, adjMap, maxRisk);
  
  // Info panel
  const info = document.createElement('div');
  info.className = 'graph-info';
  info.innerHTML = `
    <span>Стоимость: <span class="value" id="graphCost">0 ₸</span></span>
    <span>Риск: <span class="value" id="graphRisk">0</span>/<span>${maxRisk}</span></span>
    <span>Путь: <span class="value" id="graphPath">Старт</span></span>
  `;
  graphContainer.appendChild(info);
  
  // Legend
  const legend = document.createElement('div');
  legend.className = 'graph-legend';
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot start"></div>Старт</div>
    <div class="legend-item"><div class="legend-dot end"></div>Финиш</div>
    <div class="legend-item"><div class="legend-dot current"></div>Текущая</div>
  `;
  graphContainer.appendChild(legend);
  
  // Optimal display
  const optimalDisplay = document.createElement('div');
  optimalDisplay.className = 'optimal-path-display';
  if (optimalPath.cost === Infinity) {
    optimalDisplay.innerHTML = `
      <span class="label">Лучший результат:</span>
      <span class="value">Невозможно</span>
      <div class="optimal-explanation" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Нет пути с риском ≤ ${maxRisk}</div>
    `;
  } else {
    optimalDisplay.innerHTML = `
      <span class="label">Лучший результат:</span>
      <span class="value">${optimalPath.cost} ₸</span>
      <div class="optimal-explanation" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Минимальная стоимость при риске ≤ ${maxRisk}</div>
    `;
  }
  graphContainer.appendChild(optimalDisplay);
  
  container.appendChild(graphContainer);
  container.graphData = { nodes, edges, graphState, maxRisk, optimalPath, adjMap };
  
  updateGraphProgress(graphState, nodes);
  
  console.timeEnd('initGraphGame');
  console.log('[GRAPH] initGraphGame completed');
}

function generateRandomGraph(difficulty, containerWidth = 700, containerHeight = 450, minMoves = 2, responsiveConfig = getResponsiveConfig()) {
  console.log('[GENERATE] Starting with difficulty:', difficulty, 'containerWidth:', containerWidth, 'containerHeight:', containerHeight, 'minMoves:', minMoves);

  const dimensions = getEffectiveDimensions(containerWidth, containerHeight);
  const isMobile = window.innerWidth < RESPONSIVE_CONFIG.breakpoints.lg;
  const effectiveWidth = dimensions.width;
  const effectiveHeight = dimensions.height;

  const nodeSize = responsiveConfig.nodeSize;
  const paddingX = responsiveConfig.padding;
  const paddingTop = isMobile ? 58 : 95;
  const reservedTop = isMobile ? 45 : 85;
  const reservedBottom = isMobile ? 62 : 115;
  const usableWidth = Math.max(240, effectiveWidth - paddingX * 2 - nodeSize);
  const usableHeight = Math.max(180, effectiveHeight - paddingTop - reservedBottom - nodeSize);

  const difficultyExtra = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 8;
  const difficultyPath = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 7;
  const baseNodeCount = 6 + Math.floor(difficultyExtra * responsiveConfig.multiplier);
  const randomExtra = isMobile
    ? 2 + Math.floor(Math.random() * 3)
    : 1 + Math.floor(Math.random() * 4);
  const pathLength = Math.max(minMoves, Math.ceil(difficultyPath * responsiveConfig.multiplier));
  const mainPathCount = pathLength + 1;
  const desiredNodeCount = Math.max(baseNodeCount + randomExtra, mainPathCount + 1);
  const maxNodesByArea = Math.max(
    mainPathCount,
    Math.floor((usableWidth * usableHeight) / Math.max(1, nodeSize * nodeSize * 2.2))
  );
  const nodeCount = Math.max(mainPathCount, Math.min(desiredNodeCount, maxNodesByArea));
  
  console.log('[GENERATE] Node count:', nodeCount, 'Main path length:', pathLength);
  
  const nodes = [];
  const edges = [];
  const usedIds = new Set();
  const positions = [];
  
  // Create the guaranteed main path from S to F with intermediates.
  // Use non-linear placement so the route is not visually obvious.
  const wavePhase = Math.random() * Math.PI * 2;
  const waveAmplitude = Math.max(25, Math.min(usableHeight * 0.28, difficulty === 'hard' ? 130 : 95));
  for (let stage = 0; stage < mainPathCount; stage++) {
    const progress = stage / Math.max(1, mainPathCount - 1);
    const x = paddingX + (usableWidth * progress) + (Math.random() - 0.5) * (difficulty === 'hard' ? 34 : 26);
    const waveOffset = Math.sin(progress * Math.PI * (difficulty === 'hard' ? 2.5 : 2) + wavePhase) * waveAmplitude;
    const yBase = paddingTop + usableHeight * 0.5 + waveOffset;
    const y = yBase + (Math.random() - 0.5) * (difficulty === 'hard' ? 85 : 55);
    positions.push({
      x: Math.max(paddingX, Math.min(effectiveWidth - paddingX - nodeSize, x + (Math.random() - 0.5) * 20)),
      y: Math.max(reservedTop, Math.min(effectiveHeight - reservedBottom - nodeSize, y)), // Respect reservedTop
      stage
    });
  }
  
  // Add extra nodes in the middle area so they don't interfere with info block
  for (let i = positions.length; i < nodeCount; i++) {
    let x, y;
    let attempts = 0;
    const maxAttempts = 1000; // Increased attempts to ensure placement
    do {
      const stage = 1 + Math.floor(Math.random() * Math.max(1, mainPathCount - 2));
      x = paddingX + (usableWidth * stage) / (mainPathCount - 1) + (Math.random() - 0.5) * 140;
      y = paddingTop + usableHeight * (0.15 + Math.random() * 0.7);
      x = Math.max(paddingX, Math.min(effectiveWidth - paddingX - nodeSize, x));
      y = Math.max(reservedTop, Math.min(effectiveHeight - reservedBottom - nodeSize, y));
      attempts++;
      // Check distance to all existing positions
      const overlaps = positions.some(pos => {
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < nodeSize * 1.1; // Keep some visual gap between circles
      });
      if (!overlaps) break;
    } while (attempts < maxAttempts);
    if (attempts >= maxAttempts) {
      console.warn('[GENERATE] Skipping extra node to avoid overlap');
      continue;
    }
    positions.push({
      x: x,
      y: y,
      stage: 1 + Math.floor(Math.random() * Math.max(1, mainPathCount - 2))
    });
  }
  
  // Ensure no overlapping nodes by checking distance - multiple passes
  for (let pass = 0; pass < 20; pass++) { // Increased to 20 passes
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nodeSize * 1.1) { // Minimum distance to prevent overlap
          // Move the second node away
          const angle = Math.random() * 2 * Math.PI;
          positions[j].x += Math.cos(angle) * (nodeSize * 0.6);
          positions[j].y += Math.sin(angle) * (nodeSize * 0.6);
          // Clamp to bounds
          positions[j].x = Math.max(paddingX, Math.min(effectiveWidth - paddingX - nodeSize, positions[j].x));
          positions[j].y = Math.max(reservedTop, Math.min(effectiveHeight - reservedBottom - nodeSize, positions[j].y)); // Respect reservedTop
        }
      }
    }
  }
  
  // Keep S/F on guaranteed main path and only shuffle side nodes.
  const mainPathPositions = positions.slice(0, mainPathCount);
  const sidePositions = positions.slice(mainPathCount).sort(() => Math.random() - 0.5);

  for (let i = 0; i < mainPathPositions.length; i++) {
    let id;
    let attempts = 0;
    do {
      id = i === 0 ? 'S' : i === mainPathPositions.length - 1 ? 'F' : String.fromCharCode(65 + Math.floor(Math.random() * 26));
      attempts++;
      if (attempts > 100) {
        console.error('[GENERATE] Could not generate unique ID for node', i);
        id = `X${i}`;
        break;
      }
    } while (usedIds.has(id));
    usedIds.add(id);
    
    const label = id === 'S' ? 'Старт' : id === 'F' ? 'Финиш' : id;
    const type = id === 'S' ? 'start' : id === 'F' ? 'end' : '';
    const pos = mainPathPositions[i];
    nodes.push({ id, x: pos.x, y: pos.y, label, type, stage: pos.stage });
  }

  sidePositions.forEach((pos, sideIndex) => {
    let id;
    let attempts = 0;
    do {
      id = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      attempts++;
      if (attempts > 100) {
        id = `X${sideIndex + mainPathPositions.length}`;
        break;
      }
    } while (usedIds.has(id));
    usedIds.add(id);
    nodes.push({ id, x: pos.x, y: pos.y, label: id, type: '', stage: pos.stage });
  });
  
  console.log('[GENERATE] Nodes created');
  
  const usedEdges = new Set();
  
  // Guarantee the main path is present and preserves minimum move count.
  // Keep its cumulative risk under risk budget to avoid unsolvable generations.
  let remainingRiskBudget = Math.max(2, Math.floor((difficulty === 'easy' ? 0.75 : difficulty === 'medium' ? 0.82 : 0.9) * (difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 20)));
  const remainingStepsTotal = mainPathCount - 1;
  for (let i = 1; i < mainPathCount; i++) {
    const from = nodes[i - 1].id;
    const to = nodes[i].id;
    const cost = 3 + Math.floor(Math.random() * (difficulty === 'hard' ? 10 : 6));
    const remainingSteps = remainingStepsTotal - i;
    const maxRiskForStep = Math.max(1, remainingRiskBudget - remainingSteps);
    const riskUpperBound = Math.max(1, Math.min(maxRiskForStep, difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2));
    const risk = 1 + Math.floor(Math.random() * riskUpperBound);
    remainingRiskBudget -= risk;
    edges.push({ from, to, cost, risk });
    usedEdges.add(`${from}-${to}`);
    // Add reverse edge for undirected graph
    edges.push({ from: to, to: from, cost, risk });
    usedEdges.add(`${to}-${from}`);
  }
  
  // Add edges between all nodes in the same stage to ensure connectivity
  for (let stage = 0; stage < mainPathCount; stage++) {
    const stageNodes = nodes.filter(n => n.stage === stage);
    for (let i = 0; i < stageNodes.length; i++) {
      for (let j = i + 1; j < stageNodes.length; j++) {
        const from = stageNodes[i].id;
        const to = stageNodes[j].id;
        if (!usedEdges.has(`${from}-${to}`)) {
          const cost = 2 + Math.floor(Math.random() * (difficulty === 'hard' ? 8 : 4));
          const risk = 1 + Math.floor(Math.random() * (difficulty === 'hard' ? 5 : 2));
          edges.push({ from, to, cost, risk });
          usedEdges.add(`${from}-${to}`);
          edges.push({ from: to, to: from, cost, risk });
          usedEdges.add(`${to}-${from}`);
        }
      }
    }
  }
  
  // Add optional side edges to connect more nodes
  const maxExtra = isMobile ? (difficulty === 'easy' ? 12 : difficulty === 'medium' ? 17 : 20) : (difficulty === 'easy' ? 12 : difficulty === 'medium' ? 18 : 24);
  let extraAdded = 0;
  let attempts = 0;
  while (extraAdded < maxExtra && attempts < 1000) { // Increased attempts
    const fromIndex = Math.floor(Math.random() * nodes.length);
    const toIndex = Math.floor(Math.random() * nodes.length);
    const fromNode = nodes[fromIndex];
    const toNode = nodes[toIndex];
    if (fromIndex === toIndex) {
      attempts++;
      continue;
    }
    const stageDiff = Math.abs((fromNode.stage || 0) - (toNode.stage || 0));
    const maxStageDiff = difficulty === 'hard' ? 1 : (isMobile ? 3 : 4);
    if (stageDiff > maxStageDiff) {
      attempts++;
      continue;
    }
    if (usedEdges.has(`${fromNode.id}-${toNode.id}`) || usedEdges.has(`${toNode.id}-${fromNode.id}`)) {
      attempts++;
      continue;
    }
    if ((fromNode.id === 'S' && toNode.id === 'F') || (fromNode.id === 'F' && toNode.id === 'S')) {
      attempts++;
      continue;
    }
    // Prevent easy shortcuts to finish from early stages.
    if (toNode.id === 'F' && (fromNode.stage || 0) < mainPathCount - 2) {
      attempts++;
      continue;
    }
    if (difficulty === 'hard' && toNode.id === 'F' && (fromNode.stage || 0) !== mainPathCount - 2) {
      attempts++;
      continue;
    }
    if (fromNode.id === 'S' && (toNode.stage || 0) > 2) {
      attempts++;
      continue;
    }
    if (difficulty === 'hard' && fromNode.id === 'S' && (toNode.stage || 0) > 1) {
      attempts++;
      continue;
    }
    const cost = 1 + Math.floor(Math.random() * (difficulty === 'hard' ? 15 : 6)); // Increased range
    const risk = 1 + Math.floor(Math.random() * (difficulty === 'hard' ? 10 : 4)); // Increased risk range
    edges.push({ from: fromNode.id, to: toNode.id, cost, risk });
    usedEdges.add(`${fromNode.id}-${toNode.id}`);
    // Add reverse edge for undirected graph
    edges.push({ from: toNode.id, to: fromNode.id, cost, risk });
    usedEdges.add(`${toNode.id}-${fromNode.id}`);
    extraAdded++;
  }
  
  console.log('[GENERATE] Extra edges added, total edges:', edges.length);
  
  return { nodes, edges };
}

// Efficient MinHeap implementation for Dijkstra
class MinHeap {
  constructor() {
    this.heap = [];
  }
  
  enqueue(element, priority) {
    this.heap.push({ element, priority });
    this._bubbleUp(this.heap.length - 1);
  }
  
  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return root;
  }
  
  isEmpty() {
    return this.heap.length === 0;
  }
  
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }
  
  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;
      
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;
      
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

function findOptimalPath(nodes, edges, maxRisk) {
  console.log('[DIJKSTRA] Starting with nodes:', nodes.length, 'maxRisk:', maxRisk);
  
  // Build adjacency list for faster access
  const adj = {};
  edges.forEach(edge => {
    if (!adj[edge.from]) adj[edge.from] = [];
    adj[edge.from].push(edge);
  });
  
  const dist = {};
  const prev = {};
  const pq = new MinHeap();
  const visited = new Set();
  const startKey = 'S|0';
  dist[startKey] = 0;
  prev[startKey] = null;
  pq.enqueue({ node: 'S', risk: 0, key: startKey }, 0);
  
  let iterations = 0;
  while (!pq.isEmpty()) {
    iterations++;
    if (iterations > 1000) {
      console.error('[DIJKSTRA] Too many iterations, breaking');
      break;
    }
    
    const { element: currentState } = pq.dequeue();
    const { node: currentNode, risk: currentRisk, key: currentKey } = currentState;

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const currentCost = dist[currentKey];
    if (!Number.isFinite(currentCost)) continue;

    (adj[currentNode] || []).forEach(edge => {
      const newRisk = currentRisk + edge.risk;
      if (newRisk > maxRisk) return;

      const nextKey = `${edge.to}|${newRisk}`;
      const newCost = currentCost + edge.cost;
      if (dist[nextKey] === undefined || newCost < dist[nextKey]) {
        dist[nextKey] = newCost;
        prev[nextKey] = currentKey;
        pq.enqueue({ node: edge.to, risk: newRisk, key: nextKey }, newCost);
      }
    });
  }
  
  console.log('[DIJKSTRA] Completed in', iterations, 'iterations');
  
  let bestEndKey = null;
  let bestCost = Infinity;
  let bestRisk = 0;
  for (let r = 0; r <= maxRisk; r++) {
    const key = `F|${r}`;
    if (dist[key] !== undefined && dist[key] < bestCost) {
      bestCost = dist[key];
      bestEndKey = key;
      bestRisk = r;
    }
  }

  if (!bestEndKey) {
    console.log('[DIJKSTRA] No path found');
    return { cost: Infinity, risk: 0, path: [] };
  }

  const path = [];
  let currentKey = bestEndKey;
  while (currentKey) {
    const [nodeId] = currentKey.split('|');
    path.unshift(nodeId);
    currentKey = prev[currentKey];
  }

  if (path[0] !== 'S') {
    console.log('[DIJKSTRA] Invalid reconstructed path');
    return { cost: Infinity, risk: 0, path: [] };
  }

  console.log('[DIJKSTRA] Path found:', path, 'cost:', bestCost, 'risk:', bestRisk);
  return { cost: bestCost, risk: bestRisk, path };
}

function findMinimumHopsWithinRisk(nodes, edges, maxRisk) {
  const adj = {};
  edges.forEach(edge => {
    if (!adj[edge.from]) adj[edge.from] = [];
    adj[edge.from].push(edge);
  });

  const queue = [{ node: 'S', risk: 0, hops: 0 }];
  const bestHops = { 'S|0': 0 };
  let minHops = Infinity;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.hops >= minHops) continue;
    if (current.node === 'F') {
      minHops = Math.min(minHops, current.hops);
      continue;
    }

    (adj[current.node] || []).forEach(edge => {
      const newRisk = current.risk + edge.risk;
      if (newRisk > maxRisk) return;
      const newHops = current.hops + 1;
      const key = `${edge.to}|${newRisk}`;
      if (bestHops[key] !== undefined && bestHops[key] <= newHops) return;
      bestHops[key] = newHops;
      queue.push({ node: edge.to, risk: newRisk, hops: newHops });
    });
  }

  return minHops;
}

function generateValidatedGraph(difficulty, graphWidth, graphHeight, minMoves, maxRisk, responsiveConfig) {
  let bestCandidate = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = generateRandomGraph(difficulty, graphWidth, graphHeight, minMoves, responsiveConfig);
    const optimalPath = findOptimalPath(candidate.nodes, candidate.edges, maxRisk);
    const minHops = findMinimumHopsWithinRisk(candidate.nodes, candidate.edges, maxRisk);
    if (optimalPath.cost === Infinity || minHops === Infinity) continue;
    const isComplexEnough = isGraphComplexEnough(candidate.nodes, candidate.edges, maxRisk, optimalPath.path, difficulty);

    if (minHops >= minMoves && isComplexEnough) {
      return { nodes: candidate.nodes, edges: candidate.edges, optimalPath };
    }

    if (
      !bestCandidate ||
      minHops > bestCandidate.minHops ||
      (minHops === bestCandidate.minHops && isComplexEnough && !bestCandidate.isComplexEnough)
    ) {
      bestCandidate = { ...candidate, optimalPath, minHops, isComplexEnough };
    }
  }

  const minFallbackHops = difficulty === 'hard' ? Math.max(5, minMoves - 1) : Math.max(3, minMoves - 2);
  if (bestCandidate && bestCandidate.minHops >= minFallbackHops) {
    console.warn('[GRAPH] Using best fallback candidate with min hops:', bestCandidate.minHops);
    return { nodes: bestCandidate.nodes, edges: bestCandidate.edges, optimalPath: bestCandidate.optimalPath };
  }

  // Last-resort safe fallback to avoid initialization failures.
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateRandomGraph(difficulty, graphWidth, graphHeight, Math.max(3, minMoves - 2), responsiveConfig);
    const optimalPath = findOptimalPath(candidate.nodes, candidate.edges, maxRisk);
    const minHops = findMinimumHopsWithinRisk(candidate.nodes, candidate.edges, maxRisk);
    if (optimalPath.cost !== Infinity && minHops !== Infinity) {
      console.warn('[GRAPH] Using emergency fallback candidate with min hops:', minHops);
      return { nodes: candidate.nodes, edges: candidate.edges, optimalPath };
    }
  }

  throw new Error('Graph generation failed: no solvable puzzle found');
}

function isGraphComplexEnough(nodes, edges, maxRisk, optimalPath, difficulty) {
  if (!Array.isArray(optimalPath) || optimalPath.length < 2) return false;

  const adj = {};
  edges.forEach(edge => {
    if (!adj[edge.from]) adj[edge.from] = [];
    adj[edge.from].push(edge);
  });

  // Require meaningful choice at start.
  const startChoices = (adj.S || []).filter(edge => edge.risk <= maxRisk).length;
  const minStartChoices = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
  if (startChoices < minStartChoices) return false;

  // Require at least one non-optimal alternative on early optimal path steps.
  const checkDepth = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2;
  let branchPoints = 0;
  for (let i = 0; i < Math.min(checkDepth, optimalPath.length - 1); i++) {
    const nodeId = optimalPath[i];
    const nextOptimal = optimalPath[i + 1];
    const alternatives = (adj[nodeId] || []).filter(edge => edge.risk <= maxRisk && edge.to !== nextOptimal && edge.to !== 'S');
    if (alternatives.length > 0) branchPoints++;
  }
  const minBranchPoints = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
  return branchPoints >= minBranchPoints;
}

function highlightAvailable(container, graphState, adjMap, maxRisk) {
  const nodeEls = container.querySelectorAll('.graph-node');
  
  nodeEls.forEach(el => {
    el.classList.remove('available', 'blocked');
  });
  
  Object.values(adjMap[graphState.currentNode] || {}).forEach(edge => {
    const targetEl = container.querySelector(`[data-id="${edge.to}"]`);
    if (!targetEl) return;
    
    if (!graphState.path.includes(edge.to)) {
      if (graphState.totalRisk + edge.risk <= maxRisk) {
        targetEl.classList.add('available');
      } else {
        targetEl.classList.add('blocked');
      }
    }
  });
}

function handleGraphClick(nodeId, nodes, adjMap, graphState, container, maxRisk, optimalPath) {
  // Validate inputs
  if (!nodeId || !nodes || !adjMap) {
    console.error('[GRAPH] Invalid graph state:', { nodeId, nodesExists: !!nodes, adjMapExists: !!adjMap });
    showToast('Ошибка графа: невалидное состояние', 'error');
    return;
  }

  // Check if it's a valid move
  const edge = adjMap[graphState.currentNode] && adjMap[graphState.currentNode][nodeId];
  
  if (!edge) {
    showToast('Нет прямого пути к этой вершине', 'error');
    return;
  }
  
  const targetNode = nodes.find(n => n && n.id === nodeId);
  if (!targetNode) {
    console.error('[GRAPH] Target node not found:', nodeId);
    showToast('Ошибка: вершина не найдена', 'error');
    return;
  }
  
  if (graphState.path.includes(nodeId)) {
    showToast('Эта вершина уже посещена', 'error');
    return;
  }
  
  if (graphState.totalRisk + edge.risk > maxRisk) {
    showToast(`Превышен лимит риска! (+${edge.risk} риска)`, 'error');
    return;
  }
  
  // Save state for undo (with size limit)
  state.moveHistory.push(JSON.stringify({
    currentNode: graphState.currentNode,
    path: [...graphState.path],
    totalCost: graphState.totalCost,
    totalRisk: graphState.totalRisk,
    visitedEdges: [...graphState.visitedEdges]
  }));
  if (state.moveHistory.length > 100) {
    state.moveHistory.shift();
  }
  
  // Make the move
  graphState.path.push(nodeId);
  graphState.totalCost += edge.cost;
  graphState.totalRisk += edge.risk;
  graphState.visitedEdges.push({ from: graphState.currentNode, to: nodeId });
  graphState.currentNode = nodeId;
  state.moves++;
  
  // Update UI
  const nodeEls = container.querySelectorAll('.graph-node');
  nodeEls.forEach(el => {
    el.classList.remove('current', 'visited');
    if (graphState.path.includes(el.dataset.id) && el.dataset.id !== nodeId) {
      el.classList.add('visited');
    }
    if (el.dataset.id === nodeId) {
      el.classList.add('current');
    }
  });
  
  // Update edge
  const edgeEl = container.querySelector(`[data-from="${edge.from}"][data-to="${edge.to}"]`);
  if (edgeEl) {
    edgeEl.classList.add('active');
  }
  
  // Highlight available
  highlightAvailable(container, graphState, adjMap, maxRisk);
  
  // Update info
  document.getElementById('graphCost').textContent = graphState.totalCost + ' ₸';
  const riskEl = document.getElementById('graphRisk');
  riskEl.textContent = graphState.totalRisk;
  
  if (graphState.totalRisk >= maxRisk - 1) {
    riskEl.className = 'value danger';
  } else if (graphState.totalRisk >= maxRisk - 2) {
    riskEl.className = 'value warning';
  } else {
    riskEl.className = 'value';
  }
  
  const pathLabels = graphState.path.map(id => {
    const node = nodes.find(n => n.id === id);
    return node.label;
  });
  document.getElementById('graphPath').textContent = pathLabels.join(' -> ');
  
  updateMovesCount();
  updateGraphProgress(graphState, nodes);
  
  logTerminal(`[EVENT]: Перешли к ${nodes.find(n => n.id === nodeId).label}. Стоимость: +${edge.cost} ₸, Риск: +${edge.risk}`, 'event');
  
  // Check win
  if (nodeId === 'F') {
    handleGraphWin(graphState, optimalPath);
  }
  
  saveToStorage();
}

function handleGraphWin(graphState, optimalPath) {
  const costDiff = graphState.totalCost - optimalPath.cost;
  
  if (costDiff === 0) {
    showToast('Превосходно! Вы нашли оптимальный путь!', 'success');
    logTerminal('[SUCCESS]: Оптимальный путь найден!', 'success');
    state.sessionData.algorithmic = 100;
  } else if (costDiff <= 3) {
    showToast(`Отлично! Ваш путь на ${costDiff} ₸ дороже оптимального`, 'success');
    logTerminal(`[SUCCESS]: Хороший путь! На ${costDiff} ₸ дороже оптимального.`, 'success');
    state.sessionData.algorithmic = 80;
  } else {
    showToast(`Путь найден, но на ${costDiff} ₸ дороже оптимального`, 'info');
    logTerminal(`[INFO]: Путь на ${costDiff} ₸ дороже оптимального.`, 'warning');
    state.sessionData.algorithmic = 60;
  }
  
  logTerminal(`[STATS]: Ваша стоимость: ${graphState.totalCost} ₸, Оптимальная: ${optimalPath.cost} ₸`, 'event');
  
  handleWin('graph');
}

function updateGraphProgress(graphState, nodes) {
  const totalNodes = nodes.length;
  const visited = graphState.path.length;
  state.progress = Math.round((visited / totalNodes) * 100);
  
  document.getElementById('entropyValue').textContent = state.progress + '%';
  document.getElementById('entropyBar').style.width = state.progress + '%';
  
  state.progressHistory.push(state.progress);
  if (state.progressHistory.length > 20) {
    state.progressHistory.shift();
  }
  updateProgressChart();
}

// ===== Win Handler =====
function handleWin(modelType) {
  // Prevent double win execution
  if (state.isGameWon) {
    console.warn('[GAME] Win handler already triggered, ignoring duplicate call');
    return;
  }
  state.isGameWon = true;
  
  // Stop the session timer
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
  
  state.solvedTasks++;

  const solvedMoves = state.moves;
  const taskTime = Date.now() - state.sessionStart;
  state.totalTaskTime += taskTime;
  const elapsed = Math.floor(taskTime / 1000);
  
  // Update solved models
  const difficulty = state[`${modelType}Difficulty`];
  const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
  const currentStars = difficultyLevels[difficulty];
  if (!state.solvedModels[modelType].maxDifficulty || difficultyLevels[difficulty] > difficultyLevels[state.solvedModels[modelType].maxDifficulty]) {
    state.solvedModels[modelType].maxDifficulty = difficulty;
    state.solvedModels[modelType].stars = currentStars;
  }
  
  // Add to history before resetting moves (store every solved attempt)
  const attempt = {
    modelType,
    time: taskTime,
    moves: solvedMoves,
    difficulty: difficulty,
    solved: true,
    timestamp: Date.now(),
    // Snapshot algorithmic score at the moment of win (graph sets it in handleGraphWin)
    algorithmic: modelType === 'graph' ? state.sessionData.algorithmic : null
  };
  state.modelHistory[modelType].push(attempt);
  
  // Reset progress immediately after win
  state.progress = 0;
  state.moves = 0;
  
  if (modelType !== 'graph') {
    logTerminal('[SUCCESS]: Модель решена!', 'success');
    showToast('Поздравляем! Модель решена!', 'success');
  }
  
  logTerminal(`[STATS]: Время: ${elapsed}s, Ходов: ${solvedMoves}`);
  
  // Recompute session stats from full history
  state.sessionData = computeSessionDataFromHistory(state.modelHistory);

  saveToStorage();
  
  // Immediately navigate to statistics after win
  navigateTo('statistics');
  setTimeout(() => {
    showCompletionModal(modelType, {
      difficulty,
      elapsed,
      moves: solvedMoves
    });
  }, 280);
}

function computeSessionDataFromHistory(modelHistory) {
  const attempts = []
    .concat(modelHistory.matrix || [], modelHistory.rings || [], modelHistory.graph || [])
    .filter(a => a && a.solved);

  if (attempts.length === 0) {
    return { totalTime: 0, accuracy: 0, speed: 0, logic: 0, algorithmic: 0 };
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const timeBaselineSec = {
    matrix: { easy: 80, medium: 130, hard: 190 },
    rings: { easy: 90, medium: 150, hard: 220 },
    graph: { easy: 110, medium: 190, hard: 280 }
  };

  const moveBaseline = {
    matrix: { easy: 10, medium: 16, hard: 24 },
    rings: { easy: 9, medium: 14, hard: 22 },
    graph: { easy: 7, medium: 11, hard: 18 }
  };

  const perAttemptScores = attempts.map(a => {
    const difficulty = a.difficulty || 'medium';
    const seconds = Math.max(1, Math.floor((a.time || 0) / 1000));
    const moves = Math.max(0, Number(a.moves ?? 0));
    const model = ['matrix', 'rings', 'graph'].includes(a.modelType) ? a.modelType : 'matrix';

    const baseT = (timeBaselineSec[model] && timeBaselineSec[model][difficulty]) || timeBaselineSec[model].medium;
    const baseM = (moveBaseline[model] && moveBaseline[model][difficulty]) || moveBaseline[model].medium;

    const speed = clamp(Math.round((baseT / seconds) * 100), 10, 100);
    const accuracy = moves === 0 ? 100 : clamp(Math.round((baseM / moves) * 100), 5, 100);

    // Logic is a stability proxy: average of speed/accuracy with mild penalty for extreme moves.
    const movePenalty = clamp(Math.round((moves - baseM) * 2), 0, 30);
    const logic = clamp(Math.round((speed + accuracy) / 2) - movePenalty, 5, 100);

    // Algorithmic: use graph's actual value; otherwise use accuracy as proxy.
    const algorithmic =
      typeof a.algorithmic === 'number'
        ? clamp(Math.round(a.algorithmic), 0, 100)
        : clamp(Math.round(accuracy * 0.9 + logic * 0.1), 0, 100);

    return { speed, accuracy, logic, algorithmic };
  });

  const avg = key => Math.round(perAttemptScores.reduce((s, x) => s + x[key], 0) / perAttemptScores.length);

  return {
    totalTime: attempts.reduce((s, a) => s + (a.time || 0), 0),
    speed: avg('speed'),
    accuracy: avg('accuracy'),
    logic: avg('logic'),
    algorithmic: avg('algorithmic')
  };
}

// ===== Help Modal Functions =====
function showHelpModal(modelType) {
  const modelInfo = modelInstructions[modelType];
  if (!modelInfo) return;
  
  const modalTitle = document.getElementById('helpModalTitle');
  const modalContent = document.getElementById('helpModalContent');
  const serviceNames = {
    matrix: 'Google Photos',
    rings: 'Spotify / YouTube',
    graph: 'Kaspi.kz'
  };
  
  modalTitle.textContent = modelInfo.title;
  
  modalContent.innerHTML = `
    <h3>Сервис: ${serviceNames[modelType]}</h3>
    <p>${modelInfo.goal}</p>
    
    <h3>Как играть:</h3>
    ${modelInfo.howTo}
    
    <div class="help-goal">
      <strong>📌 Совет:</strong><br>
      ${modelInfo.goalNote}
    </div>
  `;
  
  const overlay = document.getElementById('helpModalOverlay');
  overlay.classList.add('active');
}

function closeHelpModal() {
  const overlay = document.getElementById('helpModalOverlay');
  overlay.classList.remove('active');
}

function showCompletionModal(modelType, stats) {
  const overlay = document.getElementById('completionModalOverlay');
  const title = document.getElementById('completionModalTitle');
  const content = document.getElementById('completionModalContent');
  if (!overlay || !title || !content) return;

  const descriptors = {
    matrix: {
      model: 'Матричная инверсия',
      service: 'Google Photos',
      action: 'вы синхронизировали состояние сетки через серию XOR-операций',
      whyCool: 'Это похоже на массовое применение правил к данным: одно действие влияет на группу зависимых элементов, и важно учитывать цепные эффекты.',
      serviceHow: 'В сервисах наподобие Google Photos похожая логика нужна при пакетной обработке изображений: фильтры, метки и состояния применяются последовательно, а система должна сохранять согласованность итогового состояния.'
    },
    rings: {
      model: 'Вложенные циклы',
      service: 'Spotify / YouTube',
      action: 'вы выровняли взаимозависимые кольца, где каждое вращение влияет на соседние уровни',
      whyCool: 'Это тренирует мышление о каскадных эффектах: локальное изменение может сдвигать всю систему.',
      serviceHow: 'В стриминговых сервисах похожий принцип возникает в пайплайнах рекомендаций и ранжирования: изменение одного фактора может перестраивать итоговую выдачу и приоритеты контента.'
    },
    graph: {
      model: 'Поиск пути в графе',
      service: 'Kaspi.kz Antifraud',
      action: 'вы построили маршрут с балансом стоимости и риска в ограниченной сети',
      whyCool: 'Это реальная задача принятия решений под ограничениями, где нужен не просто короткий путь, а оптимальный путь с учетом риска.',
      serviceHow: 'В antifraud-системах Kaspi-подобного класса транзакции анализируются как граф связей: система ищет безопасные маршруты и паттерны, минимизируя риск при сохранении эффективности операций.'
    }
  };

  const info = descriptors[modelType];
  if (!info) return;

  const difficultyLabel = getDifficultyLabel(stats.difficulty || 'medium');
  title.textContent = `Решение завершено: ${info.model}`;
  content.innerHTML = `
    <div class="completion-highlight">
      Вы только что решили задачу модели <strong>${info.model}</strong> — ${info.action}.
    </div>
    <div class="completion-metrics">
      <div class="completion-metric">
        <span class="label">Сложность</span>
        <span class="value">${difficultyLabel}</span>
      </div>
      <div class="completion-metric">
        <span class="label">Время</span>
        <span class="value">${stats.elapsed} c</span>
      </div>
      <div class="completion-metric">
        <span class="label">Ходы</span>
        <span class="value">${stats.moves}</span>
      </div>
    </div>
    <p><strong>Почему это круто:</strong> ${info.whyCool}</p>
    <div class="service-block">
      <h3>Как это работает в ${info.service}</h3>
      <p>${info.serviceHow}</p>
    </div>
  `;

  overlay.classList.add('active');
}

function closeCompletionModal() {
  const overlay = document.getElementById('completionModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
}

// ===== Workspace Utilities =====
function initWorkspace() {
  // Back button
  document.getElementById('backToDashboard').addEventListener('click', () => {
    navigateTo('dashboard');
  });

  // Back button mobile
  const backMobileBtn = document.getElementById('backButtonMobile');
  if (backMobileBtn) {
    backMobileBtn.addEventListener('click', () => {
      navigateTo('dashboard');
    });
  }
  
  // Undo button
  document.getElementById('undoMove').addEventListener('click', () => {
    if (state.moveHistory.length === 0) {
      showToast('Нет ходов для отмены', 'info');
      return;
    }
    
    const lastState = state.moveHistory.pop();
    
    if (state.currentModel === 'matrix') {
      undoMatrixMove(JSON.parse(lastState));
    } else if (state.currentModel === 'rings') {
      undoRingsMove(JSON.parse(lastState));
    } else if (state.currentModel === 'graph') {
      undoGraphMove(JSON.parse(lastState));
    }
    
    state.moves = Math.max(0, state.moves - 1);
    updateMovesCount();
    showToast('Ход отменен', 'info');
    logTerminal('[SYSTEM]: Ход отменен', 'event');
  });
  
  document.getElementById('resetCanvas').addEventListener('click', () => {
    if (state.currentModel) {
      if (state.currentModel === 'matrix') {
        state.matrixSave = null;
      }
      // Reset moves and restart timer
      state.moves = 0;
      state.sessionStart = Date.now();
      updateMovesCount();
      startSessionTimer();
      
      startModel(state.currentModel, true);
      showToast('Модель сброшена', 'info');
    }
  });
  
  document.getElementById('solveHint').addEventListener('click', () => {
    const hints = {
      matrix: 'Подсказка: Ячейки в углах влияют на меньшее количество соседей. Попробуйте работать от краев к центру.',
      rings: 'Подсказка: Начните с внутреннего кольца, так как внешние влияют на внутренние.',
      graph: 'Подсказка: Иногда путь с большей стоимостью но меньшим риском лучше, если он открывает выгодные маршруты.'
    };
    
    showToast(hints[state.currentModel] || 'Анализируйте зависимости', 'info');
    logTerminal('[HINT]: ' + (hints[state.currentModel] || '...'), 'event');
  });
  
  document.getElementById('helpButton').addEventListener('click', () => {
    if (!state.currentModel) {
      showToast('Выберите модель, чтобы получить справку.', 'info');
      return;
    }
    showHelpModal(state.currentModel);
  });
  
  // Help modal close handlers
  document.getElementById('helpModalClose').addEventListener('click', () => {
    closeHelpModal();
  });
  
  document.getElementById('helpModalOK').addEventListener('click', () => {
    closeHelpModal();
  });
  
  document.getElementById('helpModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('helpModalOverlay')) {
      closeHelpModal();
    }
  });

  // Completion modal close handlers
  document.getElementById('completionModalClose').addEventListener('click', () => {
    closeCompletionModal();
  });

  document.getElementById('completionModalOK').addEventListener('click', () => {
    closeCompletionModal();
  });

  document.getElementById('completionModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('completionModalOverlay')) {
      closeCompletionModal();
    }
  });
}

function undoMatrixMove(previousMatrix) {
  const canvas = document.getElementById('mainCanvas');
  const grid = canvas.querySelector('.matrix-grid');
  const cells = grid.querySelectorAll('.matrix-cell');
  const size = previousMatrix.length;
  
  // Restore matrix state with deep copy to avoid reference issues
  canvas.matrixData.matrix = JSON.parse(JSON.stringify(previousMatrix));
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const idx = i * size + j;
      const cell = cells[idx];
      if (cell) {
        cell.className = `matrix-cell ${canvas.matrixData.matrix[i][j] ? 'on' : 'off'}`;
        cell.textContent = canvas.matrixData.matrix[i][j];
      }
    }
  }
  
  updateProgress(canvas.matrixData.matrix);
}

function undoRingsMove(previousRotations) {
  const canvas = document.getElementById('mainCanvas');
  const ringsContainer = canvas.querySelector('.rings-container');
  const rings = canvas.ringsData;
  
  previousRotations.forEach((step, index) => {
    rings[index].step = step;
    const ringEl = ringsContainer.children[index];
    ringEl.style.transform = `rotate(${getRingRotationDeg(rings[index])}deg)`;
  });
  
  updateRingsProgress(rings);
}

function undoGraphMove(previousState) {
  const canvas = document.getElementById('mainCanvas');
  const container = canvas.querySelector('.graph-container');
  const graphData = canvas.graphData;
  
  graphData.graphState.currentNode = previousState.currentNode;
  graphData.graphState.path = [...previousState.path];
  graphData.graphState.totalCost = previousState.totalCost;
  graphData.graphState.totalRisk = previousState.totalRisk;
  graphData.graphState.visitedEdges = Array.isArray(previousState.visitedEdges) ? [...previousState.visitedEdges] : [];
  
  // Update UI
  const nodeEls = container.querySelectorAll('.graph-node');
  nodeEls.forEach(el => {
    el.classList.remove('current', 'visited');
    if (previousState.path.includes(el.dataset.id) && el.dataset.id !== previousState.currentNode) {
      el.classList.add('visited');
    }
    if (el.dataset.id === previousState.currentNode) {
      el.classList.add('current');
    }
  });
  
  // Update edges
  const edgeEls = container.querySelectorAll('.graph-edge');
  edgeEls.forEach(el => {
    const from = el.dataset.from;
    const to = el.dataset.to;
    const isActive = previousState.visitedEdges.some(e => e.from === from && e.to === to);
    if (isActive) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  
  highlightAvailable(container, graphData.graphState, graphData.adjMap, graphData.maxRisk);
  
  // Update info
  document.getElementById('graphCost').textContent = previousState.totalCost + ' ₸';
  document.getElementById('graphRisk').textContent = previousState.totalRisk;
  
  const pathLabels = previousState.path.map(id => {
    const node = graphData.nodes.find(n => n.id === id);
    return node.label;
  });
  document.getElementById('graphPath').textContent = pathLabels.join(' -> ');
  
  updateGraphProgress(graphData.graphState, graphData.nodes);
}

function clearTerminal() {
  terminalOutput.innerHTML = '';
}

function logTerminal(message, type = '') {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = message;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function updateMovesCount() {
  document.getElementById('movesCount').textContent = state.moves;
}

let sessionTimerInterval;
let lastVisibleTime = Date.now();

function startSessionTimer() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  
  // Update last visible time when starting
  lastVisibleTime = Date.now();
  
  sessionTimerInterval = setInterval(() => {
    // Only update if page is visible
    if (document.visibilityState === 'visible') {
      const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      document.getElementById('sessionTime').textContent = `${mins}:${secs}`;
    }
  }, 1000);
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page became visible, update session start time to account for time spent hidden
    const timeHidden = Date.now() - lastVisibleTime;
    state.sessionStart += timeHidden;
  } else {
    // Page became hidden, record the time
    lastVisibleTime = Date.now();
  }
});

// ===== Progress Chart =====
function initProgressChart() {
  state.progressHistory = [state.progress];
  updateProgressChart();
}

function updateProgressChart() {
  const canvas = document.getElementById('difficultyChart');
  if (!canvas) {
    console.warn('[CHART] Progress chart canvas not found');
    return;
  }
  
  // Update canvas size to match container
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 80; // Keep fixed height
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[CHART] Could not get 2D context');
    return;
  }
  
  const data = state.progressHistory;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (data.length < 2) return;
  
  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  
  const stepX = canvas.width / (Math.max(data.length - 1, 1));
  
  data.forEach((value, i) => {
    const x = i * stepX;
    const y = canvas.height - (value / 100) * canvas.height;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Fill area
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
  ctx.fill();
}

// ===== Glossary =====
function initGlossary() {
  const grid = document.getElementById('termsGrid');
  const searchInput = document.getElementById('glossarySearch');
  
  renderTerms(glossaryTerms);
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = glossaryTerms.filter(term => 
      term.title.toLowerCase().includes(query) ||
      term.definition.toLowerCase().includes(query)
    );
    renderTerms(filtered);
  });
}

function renderTerms(terms) {
  const grid = document.getElementById('termsGrid');
  grid.innerHTML = '';
  
  terms.forEach(term => {
    const card = document.createElement('div');
    card.className = 'term-card';
    card.innerHTML = `
      <div class="term-header">
        <span class="term-title">${term.title}</span>
        <div class="term-toggle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="term-content">
        <p class="term-definition">${term.definition}</p>
        <p class="term-relation">${term.relation}</p>
        <div class="term-code">${term.code}</div>
      </div>
    `;
    
    card.querySelector('.term-header').addEventListener('click', () => {
      const isExpanded = card.classList.contains('expanded');
      // Accordion: close others when opening this one
      grid.querySelectorAll('.term-card.expanded').forEach(other => {
        if (other !== card) other.classList.remove('expanded');
      });
      card.classList.toggle('expanded', !isExpanded);
    });
    
    grid.appendChild(card);
  });
}

// ===== Statistics =====
function initStatistics() {
  // Add click handlers for model details buttons
  const detailBtns = document.querySelectorAll('.model-details-btn');
  detailBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const model = btn.dataset.model;
      showModelDetails(model);
    });
  });
  
  // Close model details
  document.getElementById('closeModelDetails').addEventListener('click', () => {
    hideModelDetails();
  });
  
  document.getElementById('exportPDF').addEventListener('click', exportToPDF);
}

function showModelDetails(model) {
  const section = document.getElementById('modelDetailsSection');
  const title = document.getElementById('modelDetailsTitle');
  const content = document.getElementById('modelDetailsContent');
  const modelsSection = document.querySelector('.models-section');
  
  const modelNames = {
    matrix: 'Матричная инверсия',
    rings: 'Вложенные циклы',
    graph: 'Поиск пути в графе'
  };
  
  title.textContent = `История решений: ${modelNames[model]}`;
  
  const history = state.modelHistory[model];
  if (history.length === 0) {
    content.innerHTML = '<p>Нет решенных задач для этой модели.</p>';
  } else {
    const difficultyLabels = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
    content.innerHTML = history.map((attempt, index) => {
      const time = Math.floor(attempt.time / 1000);
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      return `
        <div class="attempt-item">
          <div class="attempt-header">
            <span class="attempt-number">Попытка ${index + 1}</span>
            <span class="attempt-difficulty">${difficultyLabels[attempt.difficulty]}</span>
          </div>
          <div class="attempt-details">
            <span>Время: ${mins}:${secs.toString().padStart(2, '0')}</span>
            <span>Ходов: ${attempt.moves}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Hide models section and show details with smooth transition
  modelsSection.classList.add('is-hidden');
  section.style.display = 'block';
  requestAnimationFrame(() => {
    section.classList.add('is-visible');
  });
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideModelDetails() {
  const section = document.getElementById('modelDetailsSection');
  const modelsSection = document.querySelector('.models-section');
  if (!section || !modelsSection) return;

  section.classList.remove('is-visible');
  setTimeout(() => {
    section.style.display = 'none';
    modelsSection.classList.remove('is-hidden');
  }, 220);
}

function updateStatistics() {
  // Always recompute from full history for consistency
  state.sessionData = computeSessionDataFromHistory(state.modelHistory);

  // Calculate total task time
  const totalSeconds = Math.floor(state.totalTaskTime / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  
  document.getElementById('totalTime').textContent = `${hours}:${mins}:${secs}`;
  document.getElementById('avgAccuracy').textContent = state.sessionData.accuracy + '%';
  document.getElementById('efficiency').textContent = Math.round(
    (state.sessionData.speed + state.sessionData.accuracy + state.sessionData.logic + state.sessionData.algorithmic) / 4
  ) + '%';
  document.getElementById('logic').textContent = state.sessionData.logic + '%';
  
  // Update research text
  const efficiency = (state.sessionData.speed + state.sessionData.accuracy + state.sessionData.logic + state.sessionData.algorithmic) / 4;
  document.getElementById('researchText').textContent = state.solvedTasks > 0 
    ? `На основе ${state.solvedTasks} решенных задач система определила вашу эффективность как ${Math.round(efficiency)}%. Скорость решения: ${state.sessionData.speed}%, точность: ${state.sessionData.accuracy}%. ${efficiency > 70 ? 'Выявлена склонность к системному анализу.' : 'Рекомендуется практика для улучшения алгоритмического мышления.'}`
    : 'Начните работу с моделями, чтобы система могла проанализировать ваш стиль решения задач.';
  
  // Update model summaries
  const models = ['matrix', 'rings', 'graph'];
  models.forEach(model => {
    const starsEl = document.getElementById(`${model}Stars`);
    const attemptsEl = document.getElementById(`${model}Attempts`);
    const modelData = state.solvedModels[model];
    const history = state.modelHistory[model];
    
    // Update stars
    const stars = starsEl.querySelectorAll('.star');
    stars.forEach((star, index) => {
      if (index < modelData.stars) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
    
    // Update attempts count
    attemptsEl.textContent = `${history.length} попыток`;
  });
  
  drawRadarChart();
}

function drawRadarChart() {
  const canvas = document.getElementById('radarChart');
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 90;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const metrics = [
    { label: 'Скорость', value: state.sessionData.speed },
    { label: 'Точность', value: state.sessionData.accuracy },
    { label: 'Алгоритмы', value: state.sessionData.algorithmic },
    { label: 'Логика', value: state.sessionData.logic }
  ];
  
  const angleStep = (Math.PI * 2) / metrics.length;
  
  // Draw grid
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    metrics.forEach((_, idx) => {
      const angle = angleStep * idx - Math.PI / 2;
      const x = centerX + Math.cos(angle) * (radius * i / 4);
      const y = centerY + Math.sin(angle) * (radius * i / 4);
      
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.closePath();
    ctx.stroke();
  }
  
  // Draw axes
  metrics.forEach((metric, idx) => {
    const angle = angleStep * idx - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Labels
    const labelX = centerX + Math.cos(angle) * (radius + 22);
    const labelY = centerY + Math.sin(angle) * (radius + 22);
    
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(metric.label, labelX, labelY);
  });
  
  // Draw data
  ctx.beginPath();
  ctx.strokeStyle = '#00d4ff';
  ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
  ctx.lineWidth = 2;
  
  metrics.forEach((metric, idx) => {
    const angle = angleStep * idx - Math.PI / 2;
    const value = metric.value / 100;
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Draw points
  metrics.forEach((metric, idx) => {
    const angle = angleStep * idx - Math.PI / 2;
    const value = metric.value / 100;
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    
    ctx.beginPath();
    ctx.fillStyle = '#00d4ff';
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function exportToPDF() {
  showToast('Генерация отчета...', 'info');
  
  setTimeout(() => {
    const report = `
ALGOLAB - ОТЧЕТ О СЕССИИ
========================

Дата: ${new Date().toLocaleDateString('ru-RU')}
Время: ${new Date().toLocaleTimeString('ru-RU')}

СТАТИСТИКА СЕССИИ
-----------------
Общее время: ${document.getElementById('totalTime').textContent}
Решено задач: ${state.solvedTasks}
Средняя точность: ${state.sessionData.accuracy}%
Общая эффективность: ${Math.round((state.sessionData.speed + state.sessionData.accuracy + state.sessionData.logic + state.sessionData.algorithmic) / 4)}%

ПРОФИЛЬ КОМПЕТЕНЦИЙ
-------------------
Скорость: ${state.sessionData.speed}%
Точность: ${state.sessionData.accuracy}%
Алгоритмическое мышление: ${state.sessionData.algorithmic}%
Логика: ${state.sessionData.logic}%

ЗАКЛЮЧЕНИЕ
----------
${document.getElementById('researchText').textContent}

========================
Сгенерировано AlgoLab
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'algolab-report.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Отчет экспортирован!', 'success');
  }, 1000);
}

function getDifficultyLabel(level) {
  const map = {
    easy: 'Легкий',
    medium: 'Средний',
    hard: 'Сложный'
  };
  return map[level] || 'Средний';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Local Storage =====
function saveToStorage() {
  const data = {
    currentPage: state.currentPage,
    currentModel: state.currentModel,
    sessionStart: state.sessionStart,
    moves: state.moves,
    progress: state.progress,
    solvedTasks: state.solvedTasks,
    matrixDifficulty: state.matrixDifficulty,
    ringsDifficulty: state.ringsDifficulty,
    graphDifficulty: state.graphDifficulty,
    totalTaskTime: state.totalTaskTime,
    solvedModels: state.solvedModels,
    modelHistory: state.modelHistory,
    sessionData: state.sessionData,
    helpShown: state.helpShown,
    matrixSave: null
  };

  if (state.currentModel === 'matrix') {
    const canvas = document.getElementById('mainCanvas');
    if (canvas && canvas.matrixData && canvas.matrixData.matrix) {
      data.matrixSave = {
        size: canvas.matrixData.size,
        matrix: canvas.matrixData.matrix,
        moveHistory: state.moveHistory.map(item => JSON.parse(item)),
        moves: state.moves,
        progress: state.progress
      };
    }
  }

  if (state.matrixSave && !data.matrixSave) {
    data.matrixSave = state.matrixSave;
  }

  try {
    localStorage.setItem('algolab_state', JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[STORAGE] Quota exceeded:', e.message);
      showToast('Хранилище переполнено. Очистите браузер кэш.', 'error');
    } else {
      console.error('[STORAGE] Save error:', e.message);
    }
  }
}

function loadFromStorageWithFallback() {
  try {
    const saved = localStorage.getItem('algolab_state');
    if (saved) {
      const data = JSON.parse(saved);
      return data;
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.warn('[STORAGE] Corrupted data in localStorage, clearing...');
      try {
        localStorage.removeItem('algolab_state');
      } catch (clearError) {
        console.error('[STORAGE] Failed to clear localStorage:', clearError.message);
      }
      showToast('Обнаружены повреждённые данные. Сброс к дефолту.', 'warning');
    } else {
      console.error('[STORAGE] Load error:', e.message);
    }
  }
  return null;
}

function loadFromStorage() {
  const data = loadFromStorageWithFallback();
  if (data) {
    Object.assign(state, data);
    if (data.matrixSave) {
      state.matrixSave = data.matrixSave;
    }
    // Initialize new fields if missing
    if (!data.totalTaskTime) state.totalTaskTime = 0;
    if (!data.solvedModels) {
      state.solvedModels = {
        matrix: { maxDifficulty: null, stars: 0 },
        rings: { maxDifficulty: null, stars: 0 },
        graph: { maxDifficulty: null, stars: 0 }
      };
    }
    if (!data.modelHistory) {
      state.modelHistory = {
        matrix: [],
        rings: [],
        graph: []
      };
    }
    if (!data.helpShown) {
      state.helpShown = {
        matrix: false,
        rings: false,
        graph: false
      };
    }
    if (data.currentPage) {
      navigateTo(data.currentPage);
    }
    if (data.currentPage === 'workspace' && data.currentModel === 'matrix' && data.matrixSave) {
      state.shouldRestoreMatrix = true;
    }
  }
}


