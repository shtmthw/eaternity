import { formatPrice, type Food } from '@eaternity/shared';
import { Dialog, errorMessage, imageUrl, useToast } from '@eaternity/ui';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../components/Layout';
import { useAdminData } from '../data/AdminData';
import { api } from '../lib/api';
import styles from './ItemsPage.module.css';

export function ItemsPage() {
  const { foods } = useAdminData();
  const [pendingDelete, setPendingDelete] = useState<Food | null>(null);

  return (
    <>
      <PageHeader
        title="Menu items"
        description="Everything customers can currently order."
        actions={
          <Link to="/items/new" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            Add item
          </Link>
        }
      />

      {foods.error && <p className="form-alert">{foods.error}</p>}

      {!foods.data && !foods.error && <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />}

      {foods.data && foods.data.length === 0 && (
        <div className={`card ${styles.empty}`}>
          <UtensilsCrossed size={22} aria-hidden="true" />
          <p className={styles.emptyTitle}>No menu items yet</p>
          <p className="muted">Add your first dish and it will appear on the storefront straight away.</p>
          <Link to="/items/new" className="btn btn-secondary">
            Add item
          </Link>
        </div>
      )}

      {foods.data && foods.data.length > 0 && (
        <div className={`card ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className={styles.right}>Price</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {foods.data.map((food) => (
                <tr key={food._id}>
                  <td>
                    <div className={styles.item}>
                      <img src={imageUrl(food.image)} alt="" className={styles.thumb} />
                      <div className={styles.itemText}>
                        <span className={styles.name}>{food.name}</span>
                        <span className={styles.description}>{food.description}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge">{food.category}</span>
                  </td>
                  <td className={styles.right}>{formatPrice(food.price)}</td>
                  <td className={styles.right}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setPendingDelete(food)}
                      aria-label={`Delete ${food.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeleteDialog food={pendingDelete} onClose={() => setPendingDelete(null)} />
    </>
  );
}

function DeleteDialog({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const { foods } = useAdminData();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    if (!food) return;
    setDeleting(true);
    try {
      await api.foods.remove(food._id);
      foods.set((current) => current.filter((item) => item._id !== food._id));
      toast.success(`${food.name} was removed from the menu`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={food !== null}
      onClose={onClose}
      title="Delete this item?"
      description={
        food
          ? `${food.name} will be removed from the menu and from any customer carts. This cannot be undone.`
          : ''
      }
    >
      <div className={styles.dialogActions}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={deleting}>
          {deleting && <span className="spinner" aria-hidden="true" />}
          Delete item
        </button>
      </div>
    </Dialog>
  );
}
