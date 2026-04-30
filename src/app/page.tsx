"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ServiceCard } from "@/components/ServiceCard/ServiceCard";
import styles from "./page.module.scss";

export default function Home() {
  const router = useRouter();

  const handleCardClick = () => {
    router.push("/dashboard");
  };

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <div className={styles.gridLines}></div>
          <div className={`${styles.gradientOrb} ${styles.orb1}`}></div>
          <div className={`${styles.gradientOrb} ${styles.orb2}`}></div>
        </div>
        
        <div className={styles.heroContainer}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot}></span>
            <span>Интерактивное обучение</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            Как работают <span className={styles.gradientText}>алгоритмы</span><br />
            в сервисах, которыми вы<br />
            пользуетесь каждый день
          </h1>
          
          <p className={styles.heroDescription}>
            Визуализируйте работу сложных алгоритмов через интерактивные головоломки. 
            Google Photos, Spotify, Kaspi.kz - узнайте, что происходит под капотом.
          </p>
          
          <Link href="/dashboard" className={styles.ctaButton}>
            <span>Начать исследование</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      <section className={styles.servicesSection}>
        <div className={styles.servicesContainer}>
          <div className={styles.servicesHeader}>
            <h2 className={styles.servicesTitle}>Алгоритмы реальных сервисов</h2>
            <p className={styles.servicesSubtitle}>Каждая модель - это упрощенная визуализация алгоритмов, используемых в популярных приложениях</p>
          </div>

          <div className={styles.servicesGrid}>
            <ServiceCard 
              modelId="matrix"
              serviceName="Матричная инверсия"
              badge="Google Photos"
              description="Как Google распознает лица и объекты? Через сверточные матрицы! Нажатие на пиксель меняет соседние - так работает коррекция ошибок при обработке изображений."
              tags={["XOR-операции", "Коды коррекции"]}
              onClick={handleCardClick}
            />
            <ServiceCard 
              modelId="rings"
              serviceName="Вложенные циклы"
              badge="Spotify / YouTube"
              description="Рекомендательная система учитывает множество факторов одновременно. Кольца - это слои алгоритма: жанр, настроение, темп. Вращение одного влияет на другие."
              tags={["Многофакторность", "Зависимости"]}
              onClick={handleCardClick}
            />
            <ServiceCard 
              modelId="graph"
              serviceName="Поиск пути в графе"
              badge="Kaspi.kz"
              description="Antifraud-система анализирует пути транзакций в реальном времени. Найдите оптимальный маршрут с минимальной стоимостью, не превысив лимит риска."
              tags={["Алгоритм Дейкстры", "Antifraud"]}
              onClick={handleCardClick}
            />
          </div>
        </div>
      </section>

      <section className={styles.howItWorksSection}>
        <div className={styles.howContainer}>
          <h2 className={styles.howTitle}>Как это работает</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <h3>Выберите модель</h3>
              <p>Каждая модель представляет реальный алгоритм из популярного сервиса</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <h3>Решите головоломку</h3>
              <p>Интерактивно взаимодействуйте с системой, понимая принципы работы</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <h3>Изучите теорию</h3>
              <p>Глоссарий объясняет математические концепции с примерами кода</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>04</div>
              <h3>Оцените результаты</h3>
              <p>Статистика покажет ваш профиль мышления и эффективность</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
