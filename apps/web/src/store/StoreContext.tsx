import {
  MAX_ITEM_QUANTITY,
  calculateTotals,
  type AuthResult,
  type Cart,
  type Food,
  type OrderTotals,
  type PublicConfig,
  type PublicUser,
} from '@eaternity/shared';
import { errorMessage, useToast } from '@eaternity/ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GUEST_CART_KEY, TOKEN_KEY, USER_KEY, api, setUnauthorizedHandler } from '../lib/api';

export type AuthMode = 'signin' | 'signup';
type LoadStatus = 'loading' | 'ready' | 'error';

export interface CartLine {
  food: Food;
  quantity: number;
}

interface AuthDialogState {
  open: boolean;
  mode: AuthMode;
  /** Optional line explaining why sign-in is needed. */
  reason?: string;
}

interface StoreValue {
  foods: Food[];
  foodsStatus: LoadStatus;
  reloadFoods: () => void;
  config: PublicConfig | null;

  user: PublicUser | null;
  completeSignIn: (result: AuthResult) => Promise<void>;
  signOut: () => void;

  cart: Cart;
  cartLines: CartLine[];
  cartCount: number;
  totals: OrderTotals;
  addToCart: (foodId: string) => Promise<void>;
  removeFromCart: (foodId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  /** False until a signed-in user's saved cart has been fetched. */
  cartReady: boolean;

  authDialog: AuthDialogState;
  openAuth: (mode?: AuthMode, reason?: string) => void;
  closeAuth: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function adjust(cart: Cart, foodId: string, delta: number): Cart {
  const next = { ...cart };
  const quantity = Math.min((next[foodId] ?? 0) + delta, MAX_ITEM_QUANTITY);
  if (quantity > 0) next[foodId] = quantity;
  else delete next[foodId];
  return next;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodsStatus, setFoodsStatus] = useState<LoadStatus>('loading');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<PublicUser | null>(() => readJson<PublicUser | null>(USER_KEY, null));
  const [cart, setCart] = useState<Cart>(() => (token ? {} : readJson<Cart>(GUEST_CART_KEY, {})));
  const [cartReady, setCartReady] = useState(() => !token);
  const [authDialog, setAuthDialog] = useState<AuthDialogState>({ open: false, mode: 'signin' });
  const [searchOpen, setSearchOpen] = useState(false);

  // Only the response to the most recent cart change is applied, so quick
  // repeated clicks cannot leave the cart showing a stale server answer.
  const cartRequest = useRef(0);

  const loadFoods = useCallback(
    () =>
      api.foods().then(
        (list) => {
          setFoods(list);
          setFoodsStatus('ready');
        },
        () => setFoodsStatus('error'),
      ),
    [],
  );

  const reloadFoods = useCallback(() => {
    setFoodsStatus('loading');
    void loadFoods();
  }, [loadFoods]);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GUEST_CART_KEY);
    cartRequest.current++;
    setToken(null);
    setUser(null);
    setCart({});
    setCartReady(true);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      toast.info('Your session has ended. Please sign in again.');
    });
  }, [signOut, toast]);

  // Initial load. The stored session is checked once; later sign-ins load the cart themselves.
  useEffect(() => {
    void loadFoods();
    api.config().then(setConfig, () => setConfig(null));

    if (localStorage.getItem(TOKEN_KEY)) {
      api.me().then(
        (me) => {
          setUser(me);
          localStorage.setItem(USER_KEY, JSON.stringify(me));
        },
        () => {},
      );
      const request = ++cartRequest.current;
      api.cart
        .get()
        .then(
          (serverCart) => {
            if (request === cartRequest.current) setCart(serverCart);
          },
          () => {},
        )
        .finally(() => setCartReady(true));
    }
  }, [loadFoods]);

  // Guests keep their cart in the browser until they sign in.
  useEffect(() => {
    if (!token) localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  }, [cart, token]);

  const refreshCart = useCallback(async () => {
    if (!token) return;
    const request = ++cartRequest.current;
    const serverCart = await api.cart.get();
    if (request === cartRequest.current) setCart(serverCart);
  }, [token]);

  const mutateCart = useCallback(
    async (foodId: string, delta: 1 | -1) => {
      setCart((current) => adjust(current, foodId, delta));
      if (!token) return;

      const request = ++cartRequest.current;
      try {
        const serverCart = delta > 0 ? await api.cart.add(foodId) : await api.cart.remove(foodId);
        if (request === cartRequest.current) setCart(serverCart);
      } catch (error) {
        toast.error(errorMessage(error));
        await refreshCart().catch(() => {});
      }
    },
    [refreshCart, toast, token],
  );

  const addToCart = useCallback((foodId: string) => mutateCart(foodId, 1), [mutateCart]);
  const removeFromCart = useCallback((foodId: string) => mutateCart(foodId, -1), [mutateCart]);

  const completeSignIn = useCallback(
    async (result: AuthResult) => {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      const guestCart = readJson<Cart>(GUEST_CART_KEY, {});
      setToken(result.token);
      setUser(result.user);

      const request = ++cartRequest.current;
      try {
        const serverCart =
          Object.keys(guestCart).length > 0 ? await api.cart.merge(guestCart) : await api.cart.get();
        localStorage.removeItem(GUEST_CART_KEY);
        if (request === cartRequest.current) setCart(serverCart);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [toast],
  );

  const openAuth = useCallback((mode: AuthMode = 'signin', reason?: string) => {
    setAuthDialog({ open: true, mode, ...(reason ? { reason } : {}) });
  }, []);
  const closeAuth = useCallback(() => setAuthDialog((current) => ({ ...current, open: false })), []);

  const value = useMemo<StoreValue>(() => {
    const cartLines = foods
      .filter((food) => (cart[food._id] ?? 0) > 0)
      .map((food) => ({ food, quantity: cart[food._id] ?? 0 }));
    return {
      foods,
      foodsStatus,
      reloadFoods,
      config,
      user,
      completeSignIn,
      signOut,
      cart,
      cartLines,
      cartCount: cartLines.reduce((sum, line) => sum + line.quantity, 0),
      totals: calculateTotals(cartLines.map((line) => ({ price: line.food.price, quantity: line.quantity }))),
      addToCart,
      removeFromCart,
      refreshCart,
      cartReady,
      authDialog,
      openAuth,
      closeAuth,
      searchOpen,
      setSearchOpen,
    };
  }, [
    foods,
    foodsStatus,
    reloadFoods,
    config,
    user,
    completeSignIn,
    signOut,
    cart,
    addToCart,
    removeFromCart,
    refreshCart,
    cartReady,
    authDialog,
    openAuth,
    closeAuth,
    searchOpen,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
