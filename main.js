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
      initGraphGame(canvas, difficulty);
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
  
  // Calculate cell size based on screen width - larger on mobile
  let cellSize, gap;
  if (window.innerWidth <= 480) {
    cellSize = 60;
    gap = 3;
  } else if (window.innerWidth <= 768) {
    cellSize = 65;
    gap = 4;
  } else {
    cellSize = 85;
    gap = 8;
  }
  
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
  
  // Calculate cell size based on screen width - larger on mobile
  let cellSize, gap;
  if (window.innerWidth <= 480) {
    cellSize = 60;
    gap = 3;
  } else if (window.innerWidth <= 768) {
    cellSize = 65;
    gap = 4;
  } else {
    cellSize = 85;
    gap = 8;
  }
  
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
  
  // Use responsive sizing via data attribute (CSS will handle responsive sizing)
  ringsContainer.dataset.difficulty = difficulty;
  
  const rings = [];
  for (let i = 0; i < numRings; i++) {
    rings.push({
      radius: 200 - i * 48,
      sectors: sectors[i],
      rotation: 0,
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
  topMarker.style.cssText = `
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 15px solid var(--accent-success);
  `;
  ringsContainer.appendChild(topMarker);
  
  container.appendChild(ringsContainer);
  container.ringsData = rings;
  updateRingsProgress(rings);
}

function buildRingsPuzzle(rings, difficulty) {
  const moveCounts = {
    easy: [3, 6],
    medium: [5, 10],
    hard: [8, 15]
  };
  const [minMoves, maxMoves] = moveCounts[difficulty] || moveCounts.medium;
  const numMoves = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;
  
  for (let i = 0; i < numMoves; i++) {
    const ringIndex = Math.floor(Math.random() * rings.length);
    const direction = Math.random() < 0.5 ? -1 : 1;
    simulateRingRotation(rings, ringIndex, direction);
  }
  
  // Ensure not solved
  const isSolved = rings.every(r => {
    const norm = ((r.rotation % 360) + 360) % 360;
    return norm < 15 || norm > 345;
  });
  if (isSolved) {
    // Apply one more random move
    const ringIndex = Math.floor(Math.random() * rings.length);
    const direction = Math.random() < 0.5 ? -1 : 1;
    simulateRingRotation(rings, ringIndex, direction);
  }
}

function simulateRingRotation(rings, ringIndex, direction) {
  const ring = rings[ringIndex];
  const step = 360 / (8 - ringIndex * 2); // Same as in createRingElement
  
  ring.rotation = (ring.rotation + step * direction + 360) % 360;
  
  // Apply dependent rotation to inner rings
  if (ringIndex < rings.length - 1) {
    const innerRing = rings[ringIndex + 1];
    const innerStep = step * direction * 0.5;
    innerRing.rotation = (innerRing.rotation + innerStep + 360) % 360;
  }
}

function createRingElement(ringData, index, allRings, container) {
  const ring = document.createElement('div');
  ring.className = 'ring';
  ring.style.width = ringData.radius * 2 + 'px';
  ring.style.height = ringData.radius * 2 + 'px';
  ring.style.left = `calc(50% - ${ringData.radius}px)`;
  ring.style.top = `calc(50% - ${ringData.radius}px)`;
  ring.style.borderColor = ringData.color;
  ring.style.transform = `rotate(${ringData.rotation}deg)`;
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
    state.moveHistory.push(JSON.stringify(allRings.map(r => r.rotation)));
    if (state.moveHistory.length > 100) {
      state.moveHistory.shift();
    }
    
    const direction = e.shiftKey ? -1 : 1;
    const step = 360 / (8 - index * 2); // Outer: 45, middle: 60, inner: 90
    
    ringData.rotation = (ringData.rotation + step * direction + 360) % 360;
    ring.style.transform = `rotate(${ringData.rotation}deg)`;
    
    // Dependent rotation: outer rings affect inner rings (in whole steps to avoid precision drift)
    if (index < allRings.length - 1) {
      const innerRing = allRings[index + 1];
      // Use whole step increments instead of 0.3 multiplier to avoid floating point accumulation
      const innerStep = step * direction * 0.5;  // Whole fraction, not floating point
      innerRing.rotation = (innerRing.rotation + innerStep + 3600) % 360;  // Added buffer
      const innerEl = container.children[index + 1];
      innerEl.style.transform = `rotate(${innerRing.rotation}deg)`;
    }
    
    state.moves++;
    updateMovesCount();
    updateRingsProgress(allRings);
    
    logTerminal(`[EVENT]: ${ringData.name} кольцо повернуто на ${step * direction}°`, 'event');
    
    // Check win - all markers at top (rotation near 0, with tolerance for precision drift)
    const aligned = allRings.every(r => {
      const norm = ((r.rotation % 360) + 360) % 360;
      // More lenient tolerance to account for floating point accumulation
      return norm < 15 || norm > 345;
    });
    
    if (aligned) {
      handleWin('rings');
    }
    
    saveToStorage();
  });
  
  return ring;
}

function updateRingsProgress(rings) {
  let totalAlignment = 0;
  
  rings.forEach(ring => {
    const norm = ((ring.rotation % 360) + 360) % 360;
    const dist = Math.min(norm, 360 - norm);
    const alignment = 1 - (dist / 180);
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
  const graphContainer = document.createElement('div');
  graphContainer.className = 'graph-container';
  
  // Clear, meaningful node positions
  const nodes = [
    { id: 'S', x: 50, y: 195, label: 'Старт', type: 'start' },
    { id: 'A', x: 200, y: 80, label: 'A' },
    { id: 'B', x: 200, y: 310, label: 'B' },
    { id: 'C', x: 380, y: 140, label: 'C' },
    { id: 'D', x: 380, y: 260, label: 'D' },
    { id: 'E', x: 520, y: 195, label: 'E' },
    { id: 'F', x: 620, y: 195, label: 'Финиш', type: 'end' }
  ];
  
  // Edges with CLEAR cost and risk labels
  const edges = [
    { from: 'S', to: 'A', cost: 4, risk: 1 },
    { from: 'S', to: 'B', cost: 2, risk: 3 },
    { from: 'A', to: 'C', cost: 3, risk: 2 },
    { from: 'A', to: 'D', cost: 5, risk: 4 },
    { from: 'B', to: 'D', cost: 2, risk: 5 },
    { from: 'C', to: 'E', cost: 4, risk: 6 },
    { from: 'C', to: 'F', cost: 8, risk: 1 },
    { from: 'D', to: 'E', cost: 3, risk: 2 },
    { from: 'D', to: 'F', cost: 6, risk: 7 },
    { from: 'E', to: 'F', cost: 2, risk: 3 }
  ];
  
  const maxRisk = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
  logTerminal(`[SYSTEM]: Макс. риск: ${maxRisk}`, 'info');
  const graphState = {
    currentNode: 'S',
    path: ['S'],
    totalCost: 0,
    totalRisk: 0,
    visitedEdges: []
  };
  
  // Calculate optimal path
  const optimalPath = findOptimalPath(nodes, edges, maxRisk);
  
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
    
    edgeEl.style.left = (fromNode.x + 30) + 'px';
    edgeEl.style.top = (fromNode.y + 30) + 'px';
    edgeEl.style.width = length + 'px';
    edgeEl.style.transform = `rotate(${angle}deg)`;
    
    graphContainer.appendChild(edgeEl);
    
    // Edge label with clear formatting
    const label = document.createElement('div');
    label.className = 'graph-edge-label';
    label.innerHTML = `<span class="cost">$${edge.cost}</span> <span class="risk">R${edge.risk}</span>`;
    label.style.left = ((fromNode.x + toNode.x) / 2 + 30) + 'px';
    label.style.top = ((fromNode.y + toNode.y) / 2 + 15) + 'px';
    graphContainer.appendChild(label);
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const nodeEl = document.createElement('div');
    nodeEl.className = `graph-node ${node.type || ''}`;
    nodeEl.textContent = node.label;
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';
    nodeEl.dataset.id = node.id;
    
    if (node.id === 'S') {
      nodeEl.classList.add('current');
    }
    
    nodeEl.addEventListener('click', () => {
      handleGraphClick(node.id, nodes, edges, graphState, graphContainer, maxRisk, optimalPath);
    });
    
    graphContainer.appendChild(nodeEl);
  });
  
  // Highlight available moves
  highlightAvailable(graphContainer, graphState, edges, maxRisk);
  
  // Info panel
  const info = document.createElement('div');
  info.className = 'graph-info';
  info.innerHTML = `
    <span>Стоимость: <span class="value" id="graphCost">$0</span></span>
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
  optimalDisplay.innerHTML = `
    <span class="label">Лучший результат:</span>
    <span class="value">$${optimalPath.cost}</span>
  `;
  graphContainer.appendChild(optimalDisplay);
  
  container.appendChild(graphContainer);
  container.graphData = { nodes, edges, graphState, maxRisk, optimalPath };
  
  updateGraphProgress(graphState, nodes);
}

function findOptimalPath(nodes, edges, maxRisk) {
  const queue = [{ id: 'S', cost: 0, risk: 0, path: ['S'] }];
  let best = { cost: Infinity, risk: 0, path: [] };
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    
    if (current.id === 'F') {
      if (current.cost < best.cost) {
        best = { cost: current.cost, risk: current.risk, path: current.path };
      }
      continue;
    }
    
    edges.filter(e => e.from === current.id).forEach(edge => {
      const newCost = current.cost + edge.cost;
      const newRisk = current.risk + edge.risk;
      
      if (newRisk <= maxRisk && newCost < best.cost) {
        queue.push({
          id: edge.to,
          cost: newCost,
          risk: newRisk,
          path: [...current.path, edge.to]
        });
      }
    });
  }
  
  return best;
}

function highlightAvailable(container, graphState, edges, maxRisk) {
  const nodeEls = container.querySelectorAll('.graph-node');
  
  nodeEls.forEach(el => {
    el.classList.remove('available', 'blocked');
  });
  
  edges.filter(e => e.from === graphState.currentNode).forEach(edge => {
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

function handleGraphClick(nodeId, nodes, edges, graphState, container, maxRisk, optimalPath) {
  // Validate inputs
  if (!nodeId || !nodes || !edges) {
    console.error('[GRAPH] Invalid graph state:', { nodeId, nodesExists: !!nodes, edgesExists: !!edges });
    showToast('Ошибка графа: невалидное состояние', 'error');
    return;
  }

  // Check if it's a valid move
  const edge = edges.find(e => e && e.from === graphState.currentNode && e.to === nodeId);
  
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
  highlightAvailable(container, graphState, edges, maxRisk);
  
  // Update info
  document.getElementById('graphCost').textContent = '$' + graphState.totalCost;
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
  
  logTerminal(`[EVENT]: Перешли к ${nodes.find(n => n.id === nodeId).label}. Стоимость: +$${edge.cost}, Риск: +${edge.risk}`, 'event');
  
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
    showToast(`Отлично! Ваш путь на $${costDiff} дороже оптимального`, 'success');
    logTerminal(`[SUCCESS]: Хороший путь! На $${costDiff} дороже оптимального.`, 'success');
    state.sessionData.algorithmic = 80;
  } else {
    showToast(`Путь найден, но на $${costDiff} дороже оптимального`, 'info');
    logTerminal(`[INFO]: Путь на $${costDiff} дороже оптимального.`, 'warning');
    state.sessionData.algorithmic = 60;
  }
  
  logTerminal(`[STATS]: Ваша стоимость: $${graphState.totalCost}, Оптимальная: $${optimalPath.cost}`, 'event');
  
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
  
  const taskTime = Date.now() - state.sessionStart;
  state.totalTaskTime += taskTime;
  const elapsed = Math.floor(taskTime / 1000);
  const efficiency = Math.max(0, 100 - state.moves * 2);
  
  // Update session data based on performance
  state.sessionData.speed = Math.min(100, Math.round(180 / Math.max(elapsed, 1) * 100));
  state.sessionData.accuracy = Math.min(100, efficiency + 20);
  state.sessionData.logic = Math.min(100, 50 + state.solvedTasks * 15);
  
  if (modelType !== 'graph') {
    state.sessionData.algorithmic = Math.min(100, 40 + efficiency * 0.6);
  }
  
  // Update solved models
  const difficulty = state[`${modelType}Difficulty`];
  const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
  const currentStars = difficultyLevels[difficulty];
  if (!state.solvedModels[modelType].maxDifficulty || difficultyLevels[difficulty] > difficultyLevels[state.solvedModels[modelType].maxDifficulty]) {
    state.solvedModels[modelType].maxDifficulty = difficulty;
    state.solvedModels[modelType].stars = currentStars;
  }
  
  // Add to history before resetting moves
  if (state.moves > 0) {
    state.modelHistory[modelType].push({
      time: taskTime,
      moves: state.moves,
      difficulty: difficulty,
      solved: true
    });
  }
  
  // Reset progress immediately after win
  state.progress = 0;
  state.moves = 0;
  
  if (modelType !== 'graph') {
    logTerminal('[SUCCESS]: Модель решена!', 'success');
    showToast('Поздравляем! Модель решена!', 'success');
  }
  
  logTerminal(`[STATS]: Время: ${elapsed}s, Ходов: ${state.moves}`);
  
  saveToStorage();
  
  // Immediately navigate to statistics after win
  navigateTo('statistics');
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
  
  previousRotations.forEach((rotation, index) => {
    rings[index].rotation = rotation;
    const ringEl = ringsContainer.children[index];
    ringEl.style.transform = `rotate(${rotation}deg)`;
  });
  
  updateRingsProgress(rings);
}

function undoGraphMove(previousState) {
  const canvas = document.getElementById('mainCanvas');
  const container = canvas.querySelector('.graph-container');
  const graphData = canvas.graphData;
  
  // Restore state
  graphData.graphState.currentNode = previousState.currentNode;
  graphData.graphState.path = previousState.path;
  graphData.graphState.totalCost = previousState.totalCost;
  graphData.graphState.totalRisk = previousState.totalRisk;
  graphData.graphState.visitedEdges = previousState.visitedEdges;
  
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
  
  highlightAvailable(container, graphData.graphState, graphData.edges, graphData.maxRisk);
  
  // Update info
  document.getElementById('graphCost').textContent = '$' + previousState.totalCost;
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
      card.classList.toggle('expanded');
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
    document.getElementById('modelDetailsSection').style.display = 'none';
    document.querySelector('.models-section').style.display = 'block';
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
  
  // Hide models section and show details
  modelsSection.style.display = 'none';
  section.style.display = 'block';
}

function updateStatistics() {
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


