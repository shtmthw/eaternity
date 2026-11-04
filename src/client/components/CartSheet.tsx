import { useNavigate } from '@tanstack/react-router';
import { cartActions, useCartPanelOpen } from '../lib/cart.ts';
import { useCart, useMoney, useUser } from '../lib/hooks.ts';
import { imageUrl } from '../lib/images.ts';
import { SummaryRow } from './OrderParts.tsx';
import { QuantityStepper } from './QuantityStepper.tsx';
import { Sheet } from './Sheet.tsx';

export function CartSheet() {
  const open = useCartPanelOpen();
  const cart = useCart();
  const user = useUser();
  const money = useMoney();
  const navigate = useNavigate();

  const checkout = () => {
    cartActions.close();
    void navigate({ to: '/checkout' });
  };

  return (
    <Sheet
      open={open}
      onClose={cartActions.close}
      title="Cart"
      footer={
        cart.count > 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <SummaryRow label="Subtotal" value={money(cart.subtotalCents)} />
              <SummaryRow label="Delivery" value={money(cart.deliveryCents)} />
              <div className="pt-1.5">
                <SummaryRow label="Total" value={money(cart.totalCents)} strong />
              </div>
            </div>
            <button type="button" className="btn btn-primary h-12 w-full" onClick={checkout}>
              Checkout
            </button>
            {!user && (
              <p className="text-center text-[13px] text-stone-500">You will sign in before paying.</p>
            )}
          </div>
        )
      }
    >
      {cart.count === 0 ? (
        <div className="grid h-full place-items-center text-center">
          <div>
            <p className="font-medium">Your cart is empty</p>
            <p className="muted mt-1 text-sm">Add a dish from the menu to get started.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {cart.lines.map(({ dish, quantity }) => (
            <li key={dish.id} className="flex gap-4 py-4 first:pt-0">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {dish.image && <img src={imageUrl(dish.image)} alt="" className="size-full object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{dish.name}</span>
                  <span className="tabular-nums">{money(dish.priceCents * quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <QuantityStepper dishId={dish.id} quantity={quantity} name={dish.name} />
                  <span className="text-[13px] text-stone-400 tabular-nums">
                    {money(dish.priceCents)} each
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
