// Central bootstrap that imports every registered game oracle so a single
// import of this module wires the whole registry.
//
// Add new game oracles to this list as they're built. Order does not matter.

import './rate-roulette-oracle'
import './token-prophet-oracle'
import './benchmark-brawl-oracle'
// ...add new game oracles here as each is converted

export {} // ensure this file is a module
