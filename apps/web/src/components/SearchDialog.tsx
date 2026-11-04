import { formatPrice } from '@eaternity/shared';
import { Dialog, imageUrl } from '@eaternity/ui';
import { CornerDownLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../store/StoreContext';
import styles from './SearchDialog.module.css';

export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useStore();
  return (
    <Dialog
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      title="Search the menu"
      hideTitle
      width={560}
    >
      {/* Mounted only while open, so every search starts empty. */}
      <SearchPanel onDone={() => setSearchOpen(false)} />
    </Dialog>
  );
}

function SearchPanel({ onDone }: { onDone: () => void }) {
  const { foods } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = term
      ? foods.filter(
          (food) =>
            food.name.toLowerCase().includes(term) ||
            food.category.toLowerCase().includes(term) ||
            food.description.toLowerCase().includes(term),
        )
      : foods;
    return matches.slice(0, 8);
  }, [foods, query]);

  const open = (foodId: string) => {
    onDone();
    navigate(`/food/${foodId}`);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.inputRow}>
        <Search size={18} className={styles.inputIcon} aria-hidden="true" />
        <input
          className={styles.input}
          type="search"
          placeholder="Search dishes, ingredients or categories"
          value={query}
          autoFocus
          aria-label="Search the menu"
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `search-result-${results[active]._id}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && results[active]) {
              event.preventDefault();
              open(results[active]._id);
            }
          }}
        />
      </div>

      {results.length > 0 ? (
        <ul id="search-results" className={styles.results} role="listbox" aria-label="Results">
          {results.map((food, index) => (
            <li
              key={food._id}
              id={`search-result-${food._id}`}
              role="option"
              aria-selected={index === active}
              className={styles.result}
              data-active={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => open(food._id)}
            >
              <img src={imageUrl(food.image)} alt="" className={styles.thumb} />
              <div className={styles.resultText}>
                <span className={styles.resultName}>{food.name}</span>
                <span className={styles.resultMeta}>{food.category}</span>
              </div>
              <span className={styles.resultPrice}>{formatPrice(food.price)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {foods.length === 0 ? 'The menu is empty right now.' : `No dishes match "${query.trim()}".`}
        </p>
      )}

      <div className={styles.hint}>
        <span>
          <kbd>&uarr;</kbd> <kbd>&darr;</kbd> to move
        </span>
        <span>
          <kbd>
            <CornerDownLeft size={11} aria-hidden="true" />
          </kbd>{' '}
          to open
        </span>
        <span>
          <kbd>Esc</kbd> to close
        </span>
      </div>
    </div>
  );
}
