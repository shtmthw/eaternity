import {
  CATEGORIES,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  foodInputSchema,
  type FoodInput,
} from '@eaternity/shared';
import { errorMessage, useToast } from '@eaternity/ui';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../components/Layout';
import { useAdminData } from '../data/AdminData';
import { api } from '../lib/api';
import styles from './AddItemPage.module.css';

type Field = keyof FoodInput | 'image';
type Values = { name: string; description: string; price: string; category: (typeof CATEGORIES)[number] };

const EMPTY: Values = { name: '', description: '', price: '', category: CATEGORIES[0] };

export function AddItemPage() {
  const { foods } = useAdminData();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Release the previous object URL whenever the preview changes or the page unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const update = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const chooseImage = (file: File | undefined) => {
    if (!file) return;
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setErrors((current) => ({ ...current, image: 'Use a JPEG, PNG, WebP, AVIF or GIF image' }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrors((current) => ({ ...current, image: 'Images must be 5 MB or smaller' }));
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, image: undefined }));
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = foodInputSchema.safeParse(values);
    const next: Partial<Record<Field, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[issue.path[0] as Field] ??= issue.message;
    }
    if (!image) next.image = 'Choose an image for this item';
    setErrors(next);
    if (!parsed.success || !image) return;

    const form = new FormData();
    form.append('name', parsed.data.name);
    form.append('description', parsed.data.description);
    form.append('price', String(parsed.data.price));
    form.append('category', parsed.data.category);
    form.append('image', image);

    setSubmitting(true);
    try {
      const created = await api.foods.create(form);
      foods.set((current) => [...current, created]);
      toast.success(`${created.name} is now on the menu`);
      setValues(EMPTY);
      clearImage();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add item"
        description="New items appear on the storefront as soon as they are saved."
      />

      <form className={styles.layout} onSubmit={submit} noValidate>
        <div className={`card ${styles.section}`}>
          <div className="field">
            <label className="label" htmlFor="item-name">
              Name
            </label>
            <input
              id="item-name"
              className="input"
              value={values.name}
              placeholder="Grilled flank steak"
              aria-invalid={errors.name ? true : undefined}
              onChange={(event) => update('name', event.target.value)}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="item-description">
              Description
            </label>
            <textarea
              id="item-description"
              className="textarea"
              rows={5}
              value={values.description}
              placeholder="What is in it, how it is cooked, what it comes with"
              aria-invalid={errors.description ? true : undefined}
              onChange={(event) => update('description', event.target.value)}
            />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>

          <div className={styles.row}>
            <div className="field">
              <label className="label" htmlFor="item-price">
                Price (USD)
              </label>
              <input
                id="item-price"
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={values.price}
                placeholder="12.50"
                aria-invalid={errors.price ? true : undefined}
                onChange={(event) => update('price', event.target.value)}
              />
              {errors.price && <p className="field-error">{errors.price}</p>}
            </div>
            <div className="field">
              <label className="label" htmlFor="item-category">
                Category
              </label>
              <select
                id="item-category"
                className="select"
                value={values.category}
                onChange={(event) => update('category', event.target.value as Values['category'])}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.side}>
          <div className={`card ${styles.section}`}>
            <span className="label">Photo</span>
            {preview ? (
              <div className={styles.preview}>
                <img src={preview} alt="Selected item" />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={clearImage}
                  aria-label="Remove image"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                className={styles.drop}
                data-dragging={dragging}
                data-invalid={Boolean(errors.image)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseImage(event.dataTransfer.files[0]);
                }}
              >
                <ImagePlus size={22} aria-hidden="true" />
                <span className={styles.dropTitle}>Drop an image or click to browse</span>
                <span className={styles.dropHint}>JPEG, PNG or WebP, up to 5 MB</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={IMAGE_MIME_TYPES.join(',')}
                  className="visually-hidden"
                  onChange={(event) => chooseImage(event.target.files?.[0])}
                />
              </label>
            )}
            {errors.image && <p className="field-error">{errors.image}</p>}
          </div>

          <div className={styles.actions}>
            <Link to="/items" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              Save item
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
