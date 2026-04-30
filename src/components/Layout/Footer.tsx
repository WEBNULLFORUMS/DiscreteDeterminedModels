import React from "react";
import Link from "next/link";
import styles from "./Footer.module.scss";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>AlgoLab</h3>
          <p className={styles.footerDescription}>
            Интерактивное обучение алгоритмам через визуализацию и головоломки
          </p>
          <p className={styles.footerCredit}>
            Разработчик: <strong>Потапченко Максим</strong> * <strong>Проект 2026</strong>
          </p>
        </div>
        <div className={styles.footerSection}>
          <h4 className={styles.footerSubtitle}>Ссылки</h4>
          <ul className={styles.footerLinks}>
            <li><Link href="/">О проекте</Link></li>
            <li><Link href="/">Контакты</Link></li>
            <li><Link href="/">GitHub</Link></li>
          </ul>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>&copy; 2026 AlgoLab. Все права защищены.</p>
      </div>
    </footer>
  );
};
