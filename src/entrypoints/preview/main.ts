// Dev-only gallery of the Chorus surfaces for visual review. Only built when
// CHORUS_PREVIEW=1 (see wxt.config.ts); never shipped.
import { mount } from 'svelte'
import Preview from './Preview.svelte'

mount(Preview, { target: document.getElementById('app')! })
