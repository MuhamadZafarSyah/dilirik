// Flat config ESLint v9 untuk seluruh monorepo.
// ESLint mencari eslint.config.* dari cwd package mana pun ke atas,
// jadi satu file di root ini berlaku untuk semua workspace (ai, api, db, shared, web).
import dilirik from "./packages/eslint-config/index.js"

export default dilirik
