import { Module } from "@medusajs/framework/utils"
import PrivacyRequestModuleService from "./service"

export const PRIVACY_REQUEST_MODULE = "privacyRequest"

export default Module(PRIVACY_REQUEST_MODULE, { service: PrivacyRequestModuleService })
