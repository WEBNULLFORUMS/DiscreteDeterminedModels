"use client";

import React, { useState } from "react";
import styles from "./page.module.scss";

const glossaryTerms = [
  {
    title: "Императивная парадигма",
    definition: "Парадигма программирования, которая описывает процесс вычисления в виде последовательности команд, изменяющих состояние программы.",
    relation: "В нашем коде: Используется для управления состоянием игровых моделей через последовательные операции.",
    code: `function updateState(action) {
  // Императивное изменение состояния
  state.moves++;
  state.progress = calculateProgress();
  render();
}`
  },
  {
    title: "XOR (Исключающее ИЛИ)",
    definition: "Логическая операция, возвращающая истину, если ровно один из операндов истинен. Обозначается символом XOR или ^.",
    relation: "В матричной модели: Каждое нажатие инвертирует ячейку и соседей через XOR.",
    code: `// XOR инверсия ячейки
cell.value = cell.value ^ 1;
// 0 -> 1, 1 -> 0`
  },
  {
    title: "Алгоритм Дейкстры",
    definition: "Алгоритм поиска кратчайшего пути от одной вершины графа до всех остальных. Работает только с неотрицательными весами ребер.",
    relation: "В графовой модели: Используется для нахождения оптимального маршрута с учетом ограничений.",
    code: `function dijkstra(graph, start) {
  const dist = {};
  const queue = new PriorityQueue();
  queue.enqueue(start, 0);
  // ... обход графа
}`
  },
  {
    title: "Энтропия системы",
    definition: "Мера хаоса или неупорядоченности в системе. В контексте алгоритмов - количество 'беспорядка', которое необходимо устранить.",
    relation: "Отображается как метрика: Уменьшается при правильных решениях пользователя.",
    code: `function calculateEntropy(matrix) {
  let disorder = 0;
  for (let cell of matrix) {
    if (cell !== target) disorder++;
  }
  return disorder / matrix.length;
}`
  },
  {
    title: "Циклическая группа",
    definition: "Группа, порожденная одним элементом. Все элементы получаются последовательным применением операции к порождающему элементу.",
    relation: "В модели колец: Вращение колец образует циклическую группу состояний.",
    code: `// Циклическое вращение
const rotate = (angle, max) => 
  (angle % max + max) % max;
// Всегда в диапазоне [0, max)`
  },
  {
    title: "Ориентированный граф",
    definition: "Граф, в котором ребра имеют направление. Ребро (u, v) позволяет перейти только от u к v, но не наоборот.",
    relation: "В Kaspi-модели: Транзакции имеют направление от отправителя к получателю.",
    code: `const graph = {
  nodes: ['A', 'B', 'C'],
  edges: [
    { from: 'A', to: 'B', weight: 5 },
    { from: 'B', to: 'C', weight: 3 }
  ]
};`
  },
  {
    title: "Матрица смежности",
    definition: "Способ представления графа в виде квадратной матрицы, где элемент a[i][j] указывает на наличие и вес ребра между вершинами i и j.",
    relation: "Используется внутренне для расчета путей в графовой модели.",
    code: `// Матрица смежности 3x3
const adj = [
  [0, 5, 0],
  [0, 0, 3],
  [0, 0, 0]
];`
  },
  {
    title: "Детерминизм",
    definition: "Свойство системы, при котором одинаковые входные данные всегда приводят к одинаковому результату. Отсутствие случайности.",
    relation: "Все модели детерминированы: Одни и те же действия дают предсказуемый результат.",
    code: `// Детерминированная функция
function nextState(current, action) {
  // Результат зависит ТОЛЬКО от
  // current и action
  return transitions[current][action];
}`
  }
];

export default function Glossary() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTerms = glossaryTerms.filter(term => 
    term.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.glossaryContainer}>
        <div className={styles.glossaryHeader}>
          <h2 className={styles.sectionTitle}>Глоссарий</h2>
          <p className={styles.sectionSubtitle}>Интеллектуальная база терминов и концепций</p>
          <div className={styles.searchContainer}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Поиск терминов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className={styles.termsGrid}>
          {filteredTerms.map((term, index) => (
            <div className={styles.termCard} key={index}>
              <div className={styles.termHeader}>
                <div className={styles.termDot}></div>
                <h3 className={styles.termTitle}>{term.title}</h3>
              </div>
              <p className={styles.termDefinition}>{term.definition}</p>
              <div className={styles.termRelation}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>{term.relation}</span>
              </div>
              <pre className={styles.termCode}>
                <code>{term.code}</code>
              </pre>
            </div>
          ))}
          {filteredTerms.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
              Термины не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
