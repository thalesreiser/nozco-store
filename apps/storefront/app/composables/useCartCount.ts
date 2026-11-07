/** Null until the count is known, and after a failure: the header then shows no number at all. */
export function useCartCount() {
  const { getCart } = useCart()
  const count = useState<number | null>("cart-count", () => null)

  async function refresh() {
    try {
      const cart = await getCart()
      count.value = (cart?.items ?? []).reduce((total, item) => total + item.quantity, 0)
    } catch {
      count.value = null
    }
  }

  return { count, refresh }
}
