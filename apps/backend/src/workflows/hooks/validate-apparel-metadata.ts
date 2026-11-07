import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assertApparelMetadata, invalidApparelMetadataKeys } from "../../lib/apparel/metadata"

// Hooks, not a helper, because the Medusa Admin and later imports call these workflows directly. An error
// here makes the workflow undo what it did. A workflow takes one consumer per hook, so new product rules
// belong in these two consumers.
createProductsWorkflow.hooks.productsCreated(({ products }) => {
  products.forEach((product) => assertApparelMetadata(product.metadata))
})

// This hook runs after the write, and undoing an update merges the old metadata back, which restores the
// old values but keeps a new key. So the invalid keys are removed first: Medusa deletes a key set to "".
updateProductsWorkflow.hooks.productsUpdated(async ({ products }, { container }) => {
  const invalidProducts = products
    .map((product) => ({ id: product.id, keys: invalidApparelMetadataKeys(product.metadata) }))
    .filter(({ keys }) => keys.length > 0)
  if (invalidProducts.length > 0) {
    await container.resolve(Modules.PRODUCT).upsertProducts(
      invalidProducts.map(({ id, keys }) => ({
        id,
        metadata: Object.fromEntries(keys.map((key) => [key, ""])),
      })),
    )
  }
  products.forEach((product) => assertApparelMetadata(product.metadata))
})
