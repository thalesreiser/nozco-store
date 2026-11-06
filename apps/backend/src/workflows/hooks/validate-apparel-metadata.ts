import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assertApparelMetadata } from "../../lib/apparel/metadata"

// Hooks, not a helper, because the Medusa Admin and later imports call these workflows directly. An error
// here makes the workflow undo what it did. A workflow takes one consumer per hook, so new product rules
// belong in these two consumers.
createProductsWorkflow.hooks.productsCreated(({ products }) => {
  products.forEach((product) => assertApparelMetadata(product.metadata))
})

updateProductsWorkflow.hooks.productsUpdated(({ products }) => {
  products.forEach((product) => assertApparelMetadata(product.metadata))
})
