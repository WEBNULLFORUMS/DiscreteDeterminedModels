"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ServiceCard } from "@/components/ServiceCard/ServiceCard";
import styles from "./page.module.scss";

export default function Dashboard() {
  const router = useRouter();
  const { state, setDifficulty, updateState } = useAppContext();

  const handleStartModel = (modelId: "matrix" | "rings" | "graph") => {
    updateState({
      currentModel: modelId,
      sessionStart: Date.now(),
      moves: 0,
      progress: 0,
      isGameWon: false,
      moveHistory: [],
    });
    router.push("/workspace");
  };

  return (
    <div className={styles.page}>
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2 className={styles.sectionTitle}>Исследовательские модули</h2>
          <p className={styles.sectionSubtitle}>Выберите модель для интерактивного исследования алгоритмов</p>
        </div>
        
        <div className={styles.cardsGrid}>
          <ServiceCard 
            modelId="matrix"
            serviceName="Матричная инверсия"
            badge="Google Photos"
            description="Как Google распознает лица и объекты? Через сверточные матрицы! Нажатие на пиксель меняет соседние - так работает коррекция ошибок при обработке изображений."
            tags={["XOR-операции", "Коды коррекции"]}
            difficulty={state.matrixDifficulty}
            onDifficultyChange={(diff) => setDifficulty("matrix", diff)}
            actionText="Запустить модель"
            onAction={() => handleStartModel("matrix")}
          />
          <ServiceCard 
            modelId="rings"
            serviceName="Вложенные циклы"
            badge="Spotify / YouTube"
            description="Рекомендательная система учитывает множество факторов одновременно. Кольца - это слои алгоритма: жанр, настроение, темп. Вращение одного влияет на другие."
            tags={["Многофакторность", "Зависимости"]}
            difficulty={state.ringsDifficulty}
            onDifficultyChange={(diff) => setDifficulty("rings", diff)}
            actionText="Запустить модель"
            onAction={() => handleStartModel("rings")}
          />
          <ServiceCard 
            modelId="graph"
            serviceName="Поиск пути в графе"
            badge="Kaspi.kz"
            description="Antifraud-система анализирует пути транзакций в реальном времени. Найдите оптимальный маршрут с минимальной стоимостью, не превысив лимит риска."
            tags={["Алгоритм Дейкстры", "Antifraud"]}
            difficulty={state.graphDifficulty}
            onDifficultyChange={(diff) => setDifficulty("graph", diff)}
            actionText="Запустить модель"
            onAction={() => handleStartModel("graph")}
          />
        </div>
      </div>
    </div>
  );
}
