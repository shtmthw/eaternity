import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronRight, ImagePlus, Plus, UtensilsCrossed } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { CATEGORIES, type Category } from '../../../shared/constants.ts';
import { parsePrice, priceInput } from '../../../shared/money.ts';
import { dishSchema } from '../../../shared/schemas.ts';
import { Field, FormError } from '../../components/Field.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { type FieldErrors, validate } from '../../lib/forms.ts';
import { useConfig, useMoney } from '../../lib/hooks.ts';
import { imageUrl, uploadImage } from '../../lib/images.ts';
import { toast } from '../../lib/toast.ts';
import type { MenuDish } from '../../lib/types.ts';
import { errorMessage, queryClient, trpc } from '../../trpc.ts';

export const Route = createFileRoute('/admin/menu')({
  loader: ({ context: { queryClient, trpc } }) => queryClient.ensureQueryData(trpc.shop.menu.queryOptions()),
  component: MenuAdmin,
});

/**
 * The dish being edited, or null for a new one. `session` changes on every
 * opening so the form starts fresh, and stays put while the panel slides shut.
 */
interface Editing {
  dish: MenuDish | null;
  session: number;
  open: boolean;
}

const refreshMenu = () => queryClient.invalidateQueries({ queryKey: trpc.shop.menu.queryKey() });

function MenuAdmin() {
  const { data: menu } = useSuspenseQuery(trpc.shop.menu.queryOptions());
  const [editing, setEditing] = useState<Editing>({ dish: null, session: 0, open: false });
  const edit = (dish: MenuDish | null) =>
    setEditing((current) => ({ dish, session: current.session + 1, open: true }));
  const money = useMoney();
  const sorted = [...menu].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));

  return (
    <>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Menu</h1>
          <p className="muted mt-1.5 text-sm">
            {menu.length === 0
              ? 'Nothing on the menu yet.'
              : `${menu.length} dishes, shown in the shop right away.`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => edit(null)}>
          <Plus size={16} />
          Add dish
        </button>
      </div>

      {menu.length > 0 && (
        <ul className="mt-10 divide-y divide-stone-100 border-y border-stone-100">
          {sorted.map((dish) => (
            <li key={dish.id}>
              <button
                type="button"
                className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-stone-50"
                onClick={() => edit(dish)}
              >
                <Thumbnail image={dish.image} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{dish.name}</p>
                  <p className="truncate text-sm text-stone-500">{dish.description || 'No description'}</p>
                </div>
                <span className="hidden w-24 text-sm text-stone-500 sm:block">{dish.category}</span>
                <span className="w-20 text-right tabular-nums">{money(dish.priceCents)}</span>
                <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DishSheet
        key={editing.session}
        dish={editing.dish}
        open={editing.open}
        onClose={() => setEditing((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

function Thumbnail({ image }: { image: string | null }) {
  return (
    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100 text-stone-300">
      {image ? (
        <img src={imageUrl(image)} alt="" className="size-full object-cover" />
      ) : (
        <UtensilsCrossed size={18} strokeWidth={1.5} />
      )}
    </div>
  );
}

interface DishValues {
  name: string;
  description: string;
  price: string;
  category: Category;
  image: string | null;
}

function DishSheet({ dish, open, onClose }: { dish: MenuDish | null; open: boolean; onClose: () => void }) {
  const { currency } = useConfig();
  const [values, setValues] = useState<DishValues>({
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    price: dish ? priceInput(dish.priceCents) : '',
    category: dish?.category ?? CATEGORIES[0],
    image: dish?.image ?? null,
  });
  const [preview, setPreview] = useState<string | null>(dish?.image ? imageUrl(dish.image) : null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Local previews are object URLs, which hold memory until released.
  useEffect(
    () => () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const set = <K extends keyof DishValues>(key: K, value: DishValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const done = (message: string) => {
    toast.info(message);
    void refreshMenu();
    onClose();
  };
  const onError = (error: unknown) => setErrors({ form: errorMessage(error) });
  const create = useMutation(
    trpc.admin.createDish.mutationOptions({
      meta: { handlesErrors: true },
      onSuccess: (saved) => done(`${saved.name} is on the menu`),
      onError,
    }),
  );
  const update = useMutation(
    trpc.admin.updateDish.mutationOptions({
      meta: { handlesErrors: true },
      onSuccess: (saved) => done(`${saved.name} saved`),
      onError,
    }),
  );
  const remove = useMutation(
    trpc.admin.deleteDish.mutationOptions({ onSuccess: () => done(`${dish?.name ?? 'Dish'} removed`) }),
  );
  const saving = create.isPending || update.isPending;

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setErrors(({ image: _image, ...rest }) => rest);
    try {
      set('image', await uploadImage(file));
    } catch (error) {
      setErrors((current) => ({ ...current, image: error instanceof Error ? error.message : String(error) }));
      setPreview(values.image ? imageUrl(values.image) : null);
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validate(dishSchema, {
      name: values.name,
      description: values.description,
      priceCents: parsePrice(values.price) ?? Number.NaN,
      category: values.category,
      image: values.image,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (dish) update.mutate({ ...result.data, id: dish.id });
    else create.mutate(result.data);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={dish ? 'Edit dish' : 'New dish'}
      footer={
        confirmingDelete && dish ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Delete {dish.name}?</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn bg-red-700 text-white hover:bg-red-800"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ id: dish.id })}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {dish ? (
              <button
                type="button"
                className="btn btn-ghost -ml-3 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                form="dish-form"
                className="btn btn-primary"
                disabled={saving || uploading}
              >
                {saving ? 'Saving…' : dish ? 'Save' : 'Add to menu'}
              </button>
            </div>
          </div>
        )
      }
    >
      <form id="dish-form" onSubmit={submit} noValidate className="space-y-5">
        <FormError>{errors.form}</FormError>

        <div>
          <span className="label">Photo</span>
          <label className="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50 transition-colors hover:border-stone-400 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-900">
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-stone-500">
                <ImagePlus size={22} strokeWidth={1.5} />
                Choose a photo
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 grid place-items-center bg-white/70 text-sm">Uploading…</span>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              onChange={(event) => void pickImage(event)}
            />
          </label>
          {errors.image ? (
            <p className="mt-1.5 text-[13px] text-red-700">{errors.image}</p>
          ) : (
            preview && (
              <p className="mt-1.5 flex justify-between text-[13px] text-stone-500">
                <span>Click the photo to replace it.</span>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    set('image', null);
                    setPreview(null);
                  }}
                >
                  Remove
                </button>
              </p>
            )
          )}
        </div>

        <Field label="Name" error={errors.name}>
          <input
            className="input"
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </Field>

        <Field label="Description" error={errors.description} hint="One or two sentences.">
          <textarea
            rows={3}
            className="input resize-none"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>

        <Field label={`Price (${currency.toUpperCase()})`} error={errors.priceCents}>
          <input
            className="input tabular-nums"
            inputMode="decimal"
            placeholder="12.50"
            value={values.price}
            onChange={(event) => set('price', event.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="label">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <label
                key={category}
                className="btn btn-secondary btn-sm has-checked:border-stone-900 has-checked:bg-stone-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-900"
              >
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={values.category === category}
                  onChange={() => set('category', category)}
                  className="sr-only"
                />
                {category}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}
