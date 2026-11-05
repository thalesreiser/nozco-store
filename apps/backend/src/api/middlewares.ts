import { defineMiddlewares } from "@medusajs/framework/http"
import { hideCpfInResponses, redactCpfInRequestLine } from "./utils/cpf-privacy"

export default defineMiddlewares({
  routes: [
    { matcher: "/*", middlewares: [redactCpfInRequestLine] },
    { matcher: "/store/carts*", middlewares: [hideCpfInResponses] },
    { matcher: "/store/orders*", middlewares: [hideCpfInResponses] },
  ],
})
