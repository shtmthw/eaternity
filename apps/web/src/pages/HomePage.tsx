import { CATEGORIES, type Category } from '@eaternity/shared';
import { ArrowRight, Clock, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import heroImage from '../assets/hero.webp';
import meatsImage from '../assets/category-meats.webp';
import mixedImage from '../assets/category-mixed.webp';
import veggiesImage from '../assets/category-veggies.webp';
import { EmptyState } from '../components/EmptyState';
import { FoodCard, FoodCardSkeleton } from '../components/FoodCard';
import { useStore } from '../store/StoreContext';
import styles from './HomePage.module.css';

type Filter = Category | 'All';

const CATEGORY_IMAGES: Record<Category, string> = {
  Meats: meatsImage,
  Veggies: veggiesImage,
  Mixed: mixedImage,
};

export function HomePage() {
  const [filter, setFilter] = useState<Filter>('All');

  return (
    <>
      <Hero />
      <section id="menu" className={`container ${styles.menu}`} aria-labelledby="menu-title">
        <div className={styles.menuHeader}>
          <h2 id="menu-title" className={styles.sectionTitle}>
            Explore the menu
          </h2>
          <p className="muted">Pick a category, or browse everything we cook.</p>
        </div>
        <CategoryFilter
          value={filter}
          // Choosing the active category again goes back to everything.
          onChange={(next) => setFilter((current) => (current === next ? 'All' : next))}
        />
        <MenuGrid filter={filter} />
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className={`container ${styles.hero}`}>
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>Fresh food, delivered</p>
        <h1 className={styles.heroTitle}>Your favourite dishes, brought to your door.</h1>
        <p className={styles.heroLead}>
          Choose from hearty meats, fresh vegetables and mixed plates. Everything is cooked to order and
          delivered hot.
        </p>
        <div className={styles.heroActions}>
          <a href="#menu" className="btn btn-primary btn-lg">
            View the menu
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <ul className={styles.perks}>
          <li>
            <Clock size={16} aria-hidden="true" />
            Cooked to order
          </li>
          <li>
            <ShieldCheck size={16} aria-hidden="true" />
            Secure checkout
          </li>
        </ul>
      </div>
      <div className={styles.heroMedia}>
        <img src={heroImage} alt="A bowl of quinoa with roasted vegetables" width={960} height={816} />
      </div>
    </section>
  );
}

function CategoryFilter({ value, onChange }: { value: Filter; onChange: (filter: Filter) => void }) {
  return (
    <div className={styles.filters} role="group" aria-label="Filter by category">
      <button
        type="button"
        className={styles.filter}
        aria-pressed={value === 'All'}
        onClick={() => onChange('All')}
      >
        <span className={styles.filterIcon}>
          <UtensilsCrossed size={16} aria-hidden="true" />
        </span>
        All dishes
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          className={styles.filter}
          aria-pressed={value === category}
          onClick={() => onChange(category)}
        >
          <img src={CATEGORY_IMAGES[category]} alt="" className={styles.filterImage} />
          {category}
        </button>
      ))}
    </div>
  );
}

function MenuGrid({ filter }: { filter: Filter }) {
  const { foods, foodsStatus, reloadFoods } = useStore();

  if (foodsStatus === 'loading') {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 4 }, (_, index) => (
          <FoodCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (foodsStatus === 'error') {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="The menu could not be loaded"
        action={
          <button type="button" className="btn btn-secondary" onClick={reloadFoods}>
            Try again
          </button>
        }
      >
        Check your connection and try again.
      </EmptyState>
    );
  }

  const visible = filter === 'All' ? foods : foods.filter((food) => food.category === filter);

  if (foods.length === 0) {
    return (
      <EmptyState icon={UtensilsCrossed} title="No dishes yet">
        Dishes added from the admin panel will appear here.
      </EmptyState>
    );
  }

  if (visible.length === 0) {
    return (
      <EmptyState icon={UtensilsCrossed} title={`No ${filter.toLowerCase()} dishes yet`}>
        Try another category or browse all dishes.
      </EmptyState>
    );
  }

  return (
    <>
      <p className={styles.resultCount}>
        {filter === 'All' ? 'All dishes' : filter} <span>&middot; {visible.length}</span>
      </p>
      <div className={styles.grid}>
        {visible.map((food) => (
          <FoodCard key={food._id} food={food} />
        ))}
      </div>
    </>
  );
}
